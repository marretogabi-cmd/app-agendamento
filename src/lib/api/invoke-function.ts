import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiResult } from "@/types/api";
import { fail, newRequestId, ok, parseEnvelope, toApiError } from "./errors";

const DEFAULT_TIMEOUT_MS = 15_000;

export type InvokeMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type InvokeFunctionOptions = {
  functionName: string;
  body?: Record<string, unknown>;
  method?: InvokeMethod;
  headers?: Record<string, string>;
  requireSession?: boolean;
  idempotencyKey?: string;
  timeoutMs?: number;
};

type FunctionsInvokeResult = {
  data: unknown;
  error: { message?: string; context?: unknown } | null;
};

type FunctionsInvoker = {
  functions: {
    invoke: (
      name: string,
      options: {
        body?: Record<string, unknown>;
        headers?: Record<string, string>;
        method?: InvokeMethod;
      },
    ) => Promise<FunctionsInvokeResult>;
  };
  auth: {
    getSession: () => Promise<{
      data: { session: { access_token: string } | null };
    }>;
  };
};

function withGetQuery(
  functionName: string,
  method: InvokeMethod | undefined,
  body: Record<string, unknown> | undefined,
): { functionName: string; body: Record<string, unknown> | undefined } {
  if (method !== "GET" || !body) {
    return { functionName, body };
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new TypeError(`GET parameter ${key} must be scalar`);
    }
    query.set(key, String(value));
  }

  const encoded = query.toString();
  return {
    functionName: encoded ? `${functionName}?${encoded}` : functionName,
    body: undefined,
  };
}

function asInvoker(
  client: SupabaseClient | FunctionsInvoker,
): FunctionsInvoker {
  return client as unknown as FunctionsInvoker;
}

async function statusFromContext(
  context: unknown,
): Promise<number | undefined> {
  if (context instanceof Response) {
    return context.status;
  }
  return undefined;
}

async function payloadFromContext(context: unknown): Promise<unknown> {
  if (!(context instanceof Response)) {
    return undefined;
  }
  try {
    return await context.clone().json();
  } catch {
    return undefined;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function invokeFunction<T>(
  client: SupabaseClient | FunctionsInvoker,
  options: InvokeFunctionOptions,
): Promise<ApiResult<T>> {
  const requestId = newRequestId();
  const invoker = asInvoker(client);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (options.requireSession) {
    const {
      data: { session },
    } = await invoker.auth.getSession();
    if (!session) {
      return fail(
        toApiError({
          code: "UNAUTHENTICATED",
          requestId,
        }),
      );
    }
  }

  const headers: Record<string, string> = {
    "x-request-id": requestId,
    ...options.headers,
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  try {
    const invocation = withGetQuery(
      options.functionName,
      options.method,
      options.body,
    );
    const { data, error } = await withTimeout(
      invoker.functions.invoke(invocation.functionName, {
        body: invocation.body,
        headers,
        method: options.method,
      }),
      timeoutMs,
    );

    if (error) {
      const status = await statusFromContext(error.context);
      const payload = await payloadFromContext(error.context);
      const enveloped = parseEnvelope<T>(payload, requestId);
      if (enveloped) {
        return enveloped;
      }

      const payloadRecord =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : undefined;

      return fail(
        toApiError({
          code: payloadRecord?.code,
          message: payloadRecord?.message ?? error.message,
          fieldErrors: payloadRecord?.fieldErrors,
          requestId,
          status,
        }),
      );
    }

    const enveloped = parseEnvelope<T>(data, requestId);
    if (enveloped) {
      return enveloped;
    }

    return ok(data as T, requestId);
  } catch {
    return fail(
      toApiError({
        code: "UNAVAILABLE",
        requestId,
      }),
    );
  }
}
