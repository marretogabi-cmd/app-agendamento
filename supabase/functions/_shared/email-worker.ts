import { dbError } from "./http.ts";
import { ApiError, type RequestContext } from "./types.ts";

type OutboxRow = {
  id: string;
  event_type: "BOOKING_CONFIRMED" | "PROVIDER_CANCELLED";
  appointment_id: string;
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new ApiError("UNAVAILABLE", 503, "Serviço de email não configurado.");
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function complete(
  context: RequestContext,
  id: string,
  success: boolean,
): Promise<void> {
  const result = await context.admin.rpc("complete_email_outbox", {
    p_id: id,
    p_success: success,
    p_error: success ? null : "Falha ao processar a notificação.",
  });
  if (result.error) dbError(result.error);
}

async function processMessage(
  context: RequestContext,
  outbox: OutboxRow,
): Promise<boolean> {
  const appointmentResult = await context.admin
    .from("Appointment")
    .select(
      "id,provider_id,client_id,start_datetime,end_datetime,cancellation_token",
    )
    .eq("id", outbox.appointment_id)
    .maybeSingle();
  if (appointmentResult.error || !appointmentResult.data) return false;

  const [clientResult, profileResult] = await Promise.all([
    context.admin
      .from("ProviderClient")
      .select("name,email")
      .eq("provider_id", appointmentResult.data.provider_id)
      .eq("client_id", appointmentResult.data.client_id)
      .maybeSingle(),
    context.admin
      .from("profiles")
      .select("name")
      .eq("id", appointmentResult.data.provider_id)
      .maybeSingle(),
  ]);
  if (
    clientResult.error || profileResult.error || !clientResult.data ||
    !profileResult.data
  ) {
    return false;
  }

  const clientName = escapeHtml(clientResult.data.name);
  const providerName = escapeHtml(profileResult.data.name);
  const start = escapeHtml(
    new Date(appointmentResult.data.start_datetime).toISOString(),
  );
  const end = escapeHtml(
    new Date(appointmentResult.data.end_datetime).toISOString(),
  );
  const isConfirmation = outbox.event_type === "BOOKING_CONFIRMED";
  const subject = isConfirmation
    ? `Agendamento confirmado com ${profileResult.data.name}`
    : `Agendamento cancelado por ${profileResult.data.name}`;
  const appUrl = requiredEnv("PUBLIC_APP_URL").replace(/\/$/, "");
  const cancellationUrl =
    `${appUrl}/cancel?token=${appointmentResult.data.cancellation_token}`;
  const html = isConfirmation
    ? `<p>Olá, ${clientName}.</p><p>Seu agendamento com ${providerName} foi confirmado de ${start} até ${end}.</p><p><a href="${
      escapeHtml(cancellationUrl)
    }">Consultar ou cancelar agendamento</a></p>`
    : `<p>Olá, ${clientName}.</p><p>O agendamento com ${providerName}, de ${start} até ${end}, foi cancelado.</p>`;

  if ((Deno.env.get("EMAIL_MODE") ?? "resend") === "test") return true;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": outbox.id,
    },
    body: JSON.stringify({
      from: requiredEnv("RESEND_FROM"),
      to: [clientResult.data.email],
      subject,
      html,
    }),
  });
  return response.ok;
}

export async function processEmailOutbox(context: RequestContext) {
  const limit = Math.max(
    1,
    Math.min(Number(context.input.limit ?? 20) || 20, 100),
  );
  const claimed = await context.admin.rpc("claim_email_outbox", {
    p_limit: limit,
  });
  if (claimed.error) dbError(claimed.error);
  const rows = (claimed.data ?? []) as OutboxRow[];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    let success = false;
    try {
      success = await processMessage(context, row);
    } catch {
      success = false;
    }
    await complete(context, row.id, success);
    if (success) sent += 1;
    else failed += 1;
  }

  return { claimed: rows.length, sent, failed };
}
