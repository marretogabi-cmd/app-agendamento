// deno-lint-ignore no-import-prefix
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { ApiError, type JsonRecord, type RouteDefinition } from "./types.ts";

const MAX_BODY_BYTES = 16_384;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new ApiError(
      "UNAVAILABLE",
      503,
      "Serviço temporariamente indisponível.",
    );
  }
  return value;
}

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("ALLOWED_ORIGINS") ??
    "http://localhost:3000,http://127.0.0.1:3000";
  return new Set(
    configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, idempotency-key, x-client-info, x-request-id, x-worker-secret",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  });
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins().has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function assertAllowedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) {
    throw new ApiError("UNAUTHORIZED", 403, "Origem não autorizada.");
  }
}

function requestIdFrom(request: Request): string {
  const candidate = request.headers.get("x-request-id")?.trim();
  return candidate && UUID_PATTERN.test(candidate)
    ? candidate
    : crypto.randomUUID();
}

async function requestInput(request: Request): Promise<JsonRecord> {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams.entries());
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new ApiError("VALIDATION", 400, "Corpo da requisição muito grande.");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new ApiError("VALIDATION", 400, "Corpo da requisição muito grande.");
  }
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" || parsed === null || Array.isArray(parsed)
    ) {
      throw new Error("invalid shape");
    }
    return parsed as JsonRecord;
  } catch {
    throw new ApiError("VALIDATION", 400, "JSON inválido.");
  }
}

function adminClient() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function providerContext(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    throw new ApiError("UNAUTHENTICATED", 401, "Sessão necessária.");
  }

  const userClient = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) {
    throw new ApiError("UNAUTHENTICATED", 401, "Sessão inválida ou expirada.");
  }
  return { user: data.user, userClient };
}

function assertWorker(request: Request): void {
  const expected = Deno.env.get("EMAIL_WORKER_SECRET")?.trim();
  const received = request.headers.get("x-worker-secret")?.trim();
  if (!expected || !received || expected !== received) {
    throw new ApiError("UNAUTHORIZED", 403, "Operação não autorizada.");
  }
}

function response(
  request: Request,
  body: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function errorBody(error: ApiError, requestId: string) {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      requestId,
    },
  };
}

export function dbError(
  error: { code?: string; message?: string } | null,
): never {
  if (error?.code === "23505" || error?.code === "23P01") {
    throw new ApiError(
      "CONFLICT",
      409,
      "O recurso conflita com dados existentes.",
    );
  }
  if (
    error?.code === "23514" ||
    error?.code === "22P02" ||
    error?.code === "22007"
  ) {
    throw new ApiError("VALIDATION", 400, "Revise os dados informados.");
  }
  if (error?.code === "42501") {
    throw new ApiError("UNAUTHORIZED", 403, "Operação não autorizada.");
  }
  throw new ApiError("INTERNAL", 500, "Não foi possível concluir a operação.");
}

export async function handleRoute(
  request: Request,
  definition: RouteDefinition,
  successStatus = 200,
): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    assertAllowedOrigin(request);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== definition.method) {
      throw new ApiError("VALIDATION", 400, "Método HTTP não suportado.");
    }

    let user = null;
    let userClient = null;
    if (definition.auth === "provider") {
      ({ user, userClient } = await providerContext(request));
    } else if (definition.auth === "worker") {
      assertWorker(request);
    }

    const data = await definition.handler({
      request,
      requestId,
      input: await requestInput(request),
      admin: adminClient(),
      user,
      userClient,
    });
    return response(request, { ok: true, data, requestId }, successStatus);
  } catch (unknownError) {
    const error = unknownError instanceof ApiError
      ? unknownError
      : new ApiError("INTERNAL", 500, "Não foi possível concluir a operação.");
    return response(request, errorBody(error, requestId), error.status);
  }
}

export function idempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || !UUID_PATTERN.test(key)) {
    throw new ApiError(
      "VALIDATION",
      400,
      "Idempotency-Key deve ser um UUID válido.",
      { idempotencyKey: ["Informe uma chave UUID válida."] },
    );
  }
  return key;
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
