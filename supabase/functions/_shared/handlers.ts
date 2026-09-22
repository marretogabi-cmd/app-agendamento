// deno-lint-ignore no-import-prefix
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { calculateDay } from "./availability.ts";
import {
  enforcePublicRateLimit,
  invalidateAvailability,
  readAvailabilityCache,
  writeAvailabilityCache,
} from "./cache.ts";
import { dbError, idempotencyKey, sha256 } from "./http.ts";
import { ApiError, type JsonRecord, type RequestContext } from "./types.ts";
import {
  assertInterval,
  assertNonEmptyPatch,
  assertTimeInterval,
  dateString,
  email,
  isoDateTime,
  object,
  optionalBoolean,
  optionalInteger,
  optionalString,
  requiredBoolean,
  requiredInteger,
  requiredString,
  slug,
  timeString,
  uuid,
} from "./validation.ts";

function notFound(): never {
  throw new ApiError("NOT_FOUND", 404, "Recurso não encontrado.");
}

function provider(context: RequestContext): {
  id: string;
  client: SupabaseClient;
} {
  if (!context.user || !context.userClient) {
    throw new ApiError("UNAUTHENTICATED", 401, "Sessão necessária.");
  }
  return { id: context.user.id, client: context.userClient };
}

function profileDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    publicSlug: row.public_slug,
    phone: row.phone,
    updatedAt: row.updated_at,
  };
}

function groupDto(row: Record<string, unknown>) {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

function ruleDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    groupId: row.group_id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

function overrideDto(row: Record<string, unknown>) {
  return {
    id: row.id,
    start: row.start_datetime,
    end: row.end_datetime,
    isAvailable: row.is_available,
  };
}

async function profileBySlug(admin: SupabaseClient, publicSlug: string) {
  const result = await admin
    .from("profiles")
    .select("id,name,public_slug")
    .eq("public_slug", publicSlug)
    .maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  return result.data;
}

export async function getAvailability(context: RequestContext) {
  await enforcePublicRateLimit(context.request, "availability", 120);
  const publicSlug = slug(context.input);
  const date = dateString(context.input, "date");
  const profile = await profileBySlug(context.admin, publicSlug);
  const cached = await readAvailabilityCache<{
    slug: string;
    date: string;
    timezone: string;
    slots: Array<{ start: string; end: string }>;
  }>(profile.id, date);
  if (cached) return cached;

  const { available } = await calculateDay(context.admin, profile.id, date);
  const result = { slug: publicSlug, date, timezone: "UTC", slots: available };
  await writeAvailabilityCache(profile.id, date, result);
  return result;
}

export async function bookAppointment(context: RequestContext) {
  await enforcePublicRateLimit(context.request, "booking", 20);
  const publicSlug = slug(context.input);
  const start = isoDateTime(context.input, "start");
  const end = isoDateTime(context.input, "end");
  assertInterval(start, end);
  const clientInput = object(context.input, "client");
  const client = {
    name: requiredString(clientInput, "name", { max: 120 }),
    email: email(clientInput, "email"),
    phone: requiredString(clientInput, "phone", { min: 7, max: 30 }),
  };
  const key = idempotencyKey(context.request);
  const profile = await profileBySlug(context.admin, publicSlug);
  const requestHash = await sha256({
    profileId: profile.id,
    start,
    end,
    client,
  });

  const result = await context.admin.rpc("book_appointment", {
    p_provider_id: profile.id,
    p_start: start,
    p_end: end,
    p_client_name: client.name,
    p_client_email: client.email,
    p_client_phone: client.phone,
    p_idempotency_key: key,
    p_request_hash: requestHash,
  });
  if (result.error) dbError(result.error);
  const data = result.data as JsonRecord;
  if (data.kind === "validation") {
    throw new ApiError("VALIDATION", 400, "Intervalo de reserva inválido.");
  }
  if (data.kind === "not_found") notFound();
  if (data.kind === "conflict" || data.kind === "key_conflict") {
    throw new ApiError("CONFLICT", 409, "Horário indisponível.");
  }
  if (data.kind === "idempotent") {
    throw new ApiError("IDEMPOTENT", 409, "Esta tentativa já foi concluída.");
  }
  await invalidateAvailability(profile.id);
  return {
    appointmentId: data.appointmentId,
    start: data.start,
    end: data.end,
    status: "CONFIRMED",
  };
}

export async function getCancellation(context: RequestContext) {
  await enforcePublicRateLimit(context.request, "cancellation-preview", 60);
  const token = uuid(context.input, "token");
  const appointmentResult = await context.admin
    .from("Appointment")
    .select("id,provider_id,start_datetime,end_datetime,status")
    .eq("cancellation_token", token)
    .maybeSingle();
  if (appointmentResult.error) dbError(appointmentResult.error);
  if (!appointmentResult.data) notFound();
  const profileResult = await context.admin
    .from("profiles")
    .select("name")
    .eq("id", appointmentResult.data.provider_id)
    .maybeSingle();
  if (profileResult.error) dbError(profileResult.error);
  if (!profileResult.data) notFound();
  return {
    appointmentId: appointmentResult.data.id,
    start: appointmentResult.data.start_datetime,
    end: appointmentResult.data.end_datetime,
    status: appointmentResult.data.status,
    providerName: profileResult.data.name,
  };
}

export async function cancelAppointment(context: RequestContext) {
  await enforcePublicRateLimit(context.request, "cancellation", 20);
  const token = uuid(context.input, "token");
  const key = idempotencyKey(context.request);
  const requestHash = await sha256({ token });
  const result = await context.admin.rpc("cancel_appointment_by_token", {
    p_token: token,
    p_idempotency_key: key,
    p_request_hash: requestHash,
  });
  if (result.error) dbError(result.error);
  const data = result.data as JsonRecord;
  if (data.kind === "not_found") notFound();
  if (data.kind === "key_conflict") {
    throw new ApiError("CONFLICT", 409, "A chave pertence a outra tentativa.");
  }
  if (data.kind === "idempotent") {
    return { appointmentId: data.appointmentId, status: "CANCELLED" };
  }

  const appointmentResult = await context.admin
    .from("Appointment")
    .select("provider_id")
    .eq("id", data.appointmentId)
    .single();
  if (!appointmentResult.error && appointmentResult.data) {
    await invalidateAvailability(appointmentResult.data.provider_id);
  }
  return { appointmentId: data.appointmentId, status: "CANCELLED" };
}

export async function getProfile(context: RequestContext) {
  const { id, client } = provider(context);
  const result = await client
    .from("profiles")
    .select("id,name,public_slug,phone,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  return profileDto(result.data);
}

export async function updateProfile(context: RequestContext) {
  const { id, client } = provider(context);
  const values = {
    name: optionalString(context.input, "name", { max: 120 }),
    public_slug: context.input.publicSlug === undefined
      ? undefined
      : slug({ slug: context.input.publicSlug }),
    phone: optionalString(context.input, "phone", {
      min: 7,
      max: 30,
      nullable: true,
    }),
  };
  assertNonEmptyPatch(values);

  const existing = await client.from("profiles").select("id").eq("id", id)
    .maybeSingle();
  if (existing.error) dbError(existing.error);
  let result;
  if (existing.data) {
    const patch = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== undefined),
    );
    result = await client
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select("id,name,public_slug,phone,updated_at")
      .single();
  } else {
    if (!values.name || !values.public_slug) {
      throw new ApiError(
        "VALIDATION",
        400,
        "Nome e slug são obrigatórios no primeiro cadastro.",
      );
    }
    result = await client
      .from("profiles")
      .insert({ id, ...values })
      .select("id,name,public_slug,phone,updated_at")
      .single();
  }
  if (result.error) dbError(result.error);
  await invalidateAvailability(id);
  return profileDto(result.data);
}

export async function listGroups(context: RequestContext) {
  const { client } = provider(context);
  const result = await client
    .from("AvailabilityRuleGroup")
    .select("id,name,is_active")
    .order("name");
  if (result.error) dbError(result.error);
  return (result.data ?? []).map(groupDto);
}

export async function createGroup(context: RequestContext) {
  const { id, client } = provider(context);
  const name = requiredString(context.input, "name", { max: 120 });
  const result = await client
    .from("AvailabilityRuleGroup")
    .insert({ provider_id: id, name })
    .select("id,name,is_active")
    .single();
  if (result.error) dbError(result.error);
  return groupDto(result.data);
}

export async function updateGroup(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const name = optionalString(context.input, "name", { max: 120 });
  assertNonEmptyPatch({ name });
  const result = await client
    .from("AvailabilityRuleGroup")
    .update({ name })
    .eq("id", id)
    .select("id,name,is_active")
    .maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  await invalidateAvailability(providerId);
  return groupDto(result.data);
}

type RuleWindow = { day_of_week: number; start_time: string; end_time: string };

function rulesOverlap(left: RuleWindow, right: RuleWindow): boolean {
  return left.day_of_week === right.day_of_week &&
    left.start_time < right.end_time && right.start_time < left.end_time;
}

async function assertNoRuleConflict(
  context: RequestContext,
  providerId: string,
  groupId: string,
  candidate: RuleWindow,
  excludedRuleId?: string,
): Promise<void> {
  const group = await context.admin
    .from("AvailabilityRuleGroup")
    .select("id,is_active")
    .eq("id", groupId)
    .eq("provider_id", providerId)
    .maybeSingle();
  if (group.error) dbError(group.error);
  if (!group.data) notFound();

  let groupIds = [groupId];
  if (group.data.is_active) {
    const activeGroups = await context.admin
      .from("AvailabilityRuleGroup")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_active", true);
    if (activeGroups.error) dbError(activeGroups.error);
    groupIds = (activeGroups.data ?? []).map((row) => row.id);
  }

  let query = context.admin
    .from("AvailabilityRule")
    .select("id,day_of_week,start_time,end_time")
    .in("group_id", groupIds);
  if (excludedRuleId) query = query.neq("id", excludedRuleId);
  const existingRules = await query;
  if (existingRules.error) dbError(existingRules.error);
  if (
    (existingRules.data ?? []).some((rule) => rulesOverlap(candidate, rule))
  ) {
    throw new ApiError(
      "CONFLICT",
      409,
      "O intervalo conflita com outra regra.",
    );
  }
}

export async function setGroupActive(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const isActive = requiredBoolean(context.input, "isActive");

  const ownedGroup = await client
    .from("AvailabilityRuleGroup")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (ownedGroup.error) dbError(ownedGroup.error);
  if (!ownedGroup.data) notFound();

  if (isActive) {
    const targetRules = await context.admin
      .from("AvailabilityRule")
      .select("day_of_week,start_time,end_time")
      .eq("group_id", id);
    const activeGroups = await context.admin
      .from("AvailabilityRuleGroup")
      .select("id")
      .eq("provider_id", providerId)
      .eq("is_active", true)
      .neq("id", id);
    if (targetRules.error) dbError(targetRules.error);
    if (activeGroups.error) dbError(activeGroups.error);
    const target = targetRules.data ?? [];
    if (
      target.some((rule, index) =>
        target.slice(index + 1).some((other) => rulesOverlap(rule, other))
      )
    ) {
      throw new ApiError(
        "CONFLICT",
        409,
        "O grupo contém intervalos conflitantes.",
      );
    }
    const activeIds = (activeGroups.data ?? []).map((row) => row.id);
    if (activeIds.length > 0) {
      const activeRules = await context.admin
        .from("AvailabilityRule")
        .select("day_of_week,start_time,end_time")
        .in("group_id", activeIds);
      if (activeRules.error) dbError(activeRules.error);
      if (
        (targetRules.data ?? []).some((target) =>
          (activeRules.data ?? []).some((active) =>
            rulesOverlap(target, active)
          )
        )
      ) {
        throw new ApiError(
          "CONFLICT",
          409,
          "O grupo conflita com outro grupo ativo.",
        );
      }
    }
  }

  const result = await client
    .from("AvailabilityRuleGroup")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id,name,is_active")
    .maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  await invalidateAvailability(providerId);
  return groupDto(result.data);
}

export async function deleteGroup(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const result = await client
    .from("AvailabilityRuleGroup")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  await invalidateAvailability(providerId);
  return { id };
}

export async function listRules(context: RequestContext) {
  const { client } = provider(context);
  const groupId = uuid(context.input, "groupId");
  const result = await client
    .from("AvailabilityRule")
    .select("id,group_id,day_of_week,start_time,end_time")
    .eq("group_id", groupId)
    .order("day_of_week")
    .order("start_time");
  if (result.error) dbError(result.error);
  return (result.data ?? []).map(ruleDto);
}

export async function createRule(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const groupId = uuid(context.input, "groupId");
  const dayOfWeek = requiredInteger(context.input, "dayOfWeek", 1, 7);
  const startTime = timeString(context.input, "startTime");
  const endTime = timeString(context.input, "endTime");
  assertTimeInterval(startTime, endTime);
  await assertNoRuleConflict(context, providerId, groupId, {
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  });
  const result = await client
    .from("AvailabilityRule")
    .insert({
      group_id: groupId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .select("id,group_id,day_of_week,start_time,end_time")
    .single();
  if (result.error) dbError(result.error);
  await invalidateAvailability(providerId);
  return ruleDto(result.data);
}

export async function updateRule(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const current = await client
    .from("AvailabilityRule")
    .select("id,group_id,day_of_week,start_time,end_time")
    .eq("id", id)
    .maybeSingle();
  if (current.error) dbError(current.error);
  if (!current.data) notFound();
  const dayOfWeek = optionalInteger(context.input, "dayOfWeek", 1, 7);
  const startTime = context.input.startTime === undefined
    ? undefined
    : timeString(context.input, "startTime");
  const endTime = context.input.endTime === undefined
    ? undefined
    : timeString(context.input, "endTime");
  assertNonEmptyPatch({ dayOfWeek, startTime, endTime });
  const nextRule = {
    day_of_week: dayOfWeek ?? current.data.day_of_week,
    start_time: startTime ?? current.data.start_time,
    end_time: endTime ?? current.data.end_time,
  };
  assertTimeInterval(nextRule.start_time, nextRule.end_time);
  await assertNoRuleConflict(
    context,
    providerId,
    current.data.group_id,
    nextRule,
    id,
  );
  const result = await client
    .from("AvailabilityRule")
    .update({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("id", id)
    .select("id,group_id,day_of_week,start_time,end_time")
    .single();
  if (result.error) dbError(result.error);
  await invalidateAvailability(providerId);
  return ruleDto(result.data);
}

export async function deleteRule(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const result = await client.from("AvailabilityRule").delete().eq("id", id)
    .select("id").maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  await invalidateAvailability(providerId);
  return { id };
}

async function assertNoBookedOverlap(
  admin: SupabaseClient,
  providerId: string,
  start: string,
  end: string,
  isAvailable: boolean,
): Promise<void> {
  if (isAvailable) return;
  const result = await admin
    .from("Appointment")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("status", "CONFIRMED")
    .lt("start_datetime", end)
    .gt("end_datetime", start);
  if (result.error) dbError(result.error);
  if ((result.count ?? 0) > 0) {
    throw new ApiError(
      "CONFLICT",
      409,
      "O bloqueio conflita com uma reserva confirmada.",
    );
  }
}

export async function listOverrides(context: RequestContext) {
  const { client } = provider(context);
  const result = await client
    .from("AvailabilityOverride")
    .select("id,start_datetime,end_datetime,is_available")
    .order("start_datetime");
  if (result.error) dbError(result.error);
  return (result.data ?? []).map(overrideDto);
}

export async function createOverride(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const start = isoDateTime(context.input, "start");
  const end = isoDateTime(context.input, "end");
  const isAvailable = requiredBoolean(context.input, "isAvailable");
  assertInterval(start, end);
  await assertNoBookedOverlap(
    context.admin,
    providerId,
    start,
    end,
    isAvailable,
  );
  const result = await client
    .from("AvailabilityOverride")
    .insert({
      provider_id: providerId,
      start_datetime: start,
      end_datetime: end,
      is_available: isAvailable,
    })
    .select("id,start_datetime,end_datetime,is_available")
    .single();
  if (result.error) dbError(result.error);
  await invalidateAvailability(providerId);
  return overrideDto(result.data);
}

export async function updateOverride(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const current = await client
    .from("AvailabilityOverride")
    .select("id,start_datetime,end_datetime,is_available")
    .eq("id", id)
    .maybeSingle();
  if (current.error) dbError(current.error);
  if (!current.data) notFound();
  const start = context.input.start === undefined
    ? undefined
    : isoDateTime(context.input, "start");
  const end = context.input.end === undefined
    ? undefined
    : isoDateTime(context.input, "end");
  const isAvailable = optionalBoolean(context.input, "isAvailable");
  assertNonEmptyPatch({ start, end, isAvailable });
  const nextStart = start ?? current.data.start_datetime;
  const nextEnd = end ?? current.data.end_datetime;
  const nextAvailable = isAvailable ?? current.data.is_available;
  assertInterval(nextStart, nextEnd);
  await assertNoBookedOverlap(
    context.admin,
    providerId,
    nextStart,
    nextEnd,
    nextAvailable,
  );
  const result = await client
    .from("AvailabilityOverride")
    .update({
      start_datetime: start,
      end_datetime: end,
      is_available: isAvailable,
    })
    .eq("id", id)
    .select("id,start_datetime,end_datetime,is_available")
    .single();
  if (result.error) dbError(result.error);
  await invalidateAvailability(providerId);
  return overrideDto(result.data);
}

export async function deleteOverride(context: RequestContext) {
  const { id: providerId, client } = provider(context);
  const id = uuid(context.input, "id");
  const result = await client.from("AvailabilityOverride").delete().eq("id", id)
    .select("id").maybeSingle();
  if (result.error) dbError(result.error);
  if (!result.data) notFound();
  await invalidateAvailability(providerId);
  return { id };
}

export async function getDailyAgenda(context: RequestContext) {
  const { id } = provider(context);
  const date = dateString(context.input, "date");
  const { agenda } = await calculateDay(context.admin, id, date);
  return { date, slots: agenda };
}

export async function listClients(context: RequestContext) {
  const { client } = provider(context);
  const clients = await client
    .from("ProviderClient")
    .select("id,name,email,phone")
    .order("name");
  if (clients.error) dbError(clients.error);
  return clients.data ?? [];
}

export async function cancelAppointmentAsProvider(context: RequestContext) {
  const { id: providerId } = provider(context);
  const appointmentId = uuid(context.input, "appointmentId");
  const key = idempotencyKey(context.request);
  const requestHash = await sha256({ providerId, appointmentId });
  const result = await context.admin.rpc("cancel_appointment_as_provider", {
    p_provider_id: providerId,
    p_appointment_id: appointmentId,
    p_idempotency_key: key,
    p_request_hash: requestHash,
  });
  if (result.error) dbError(result.error);
  const data = result.data as JsonRecord;
  if (data.kind === "not_found") notFound();
  if (data.kind === "key_conflict") {
    throw new ApiError("CONFLICT", 409, "A chave pertence a outra tentativa.");
  }
  await invalidateAvailability(providerId);
  return { appointmentId: data.appointmentId, status: "CANCELLED" };
}
