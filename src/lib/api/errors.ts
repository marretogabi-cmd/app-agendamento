import {
  type ApiError,
  type ApiErrorCode,
  type ApiResult,
  isApiErrorCode,
} from "@/types/api";

export const DEFAULT_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  VALIDATION: "Dados inválidos.",
  UNAUTHENTICATED: "Sessão expirada ou ausente.",
  UNAUTHORIZED: "Você não pode acessar este recurso.",
  NOT_FOUND: "Recurso não encontrado.",
  CONFLICT: "Horário indisponível. Atualize a agenda.",
  IDEMPOTENT: "Esta operação já foi concluída.",
  UNAVAILABLE: "Serviço temporariamente indisponível.",
  INTERNAL: "Não foi possível concluir. Tente de novo.",
};

const TOKEN_LIKE = /cancellation[_-]?token[=:]\S+|bearer\s+\S+/gi;

export function redactSensitiveText(value: string): string {
  return value.replace(TOKEN_LIKE, "[redacted]");
}

export function newRequestId(): string {
  return crypto.randomUUID();
}

export function httpStatusToCode(status: number): ApiErrorCode {
  if (status === 400) return "VALIDATION";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 408 || status === 429 || status === 503) return "UNAVAILABLE";
  return "INTERNAL";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function parseEnvelope<T>(
  payload: unknown,
  fallbackRequestId: string,
): ApiResult<T> | undefined {
  const record = asRecord(payload);
  if (!record || typeof record.ok !== "boolean") {
    return undefined;
  }

  const requestId =
    typeof record.requestId === "string" ? record.requestId : fallbackRequestId;

  if (record.ok === true) {
    return { ok: true, data: record.data as T, requestId };
  }

  const errorRecord = asRecord(record.error);
  const code = isApiErrorCode(errorRecord?.code)
    ? errorRecord.code
    : "INTERNAL";
  const message =
    typeof errorRecord?.message === "string"
      ? redactSensitiveText(errorRecord.message)
      : DEFAULT_ERROR_MESSAGES[code];
  const fieldErrors = asRecord(errorRecord?.fieldErrors) as
    Record<string, string[]> | undefined;

  return {
    ok: false,
    error: {
      code,
      message,
      fieldErrors,
      requestId:
        typeof errorRecord?.requestId === "string"
          ? errorRecord.requestId
          : requestId,
    },
  };
}

export function toApiError(input: {
  code?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
  requestId: string;
  status?: number;
}): ApiError {
  const fromBody = isApiErrorCode(input.code) ? input.code : undefined;
  const code = fromBody ?? httpStatusToCode(input.status ?? 500);
  const message =
    typeof input.message === "string" && input.message.trim().length > 0
      ? redactSensitiveText(input.message)
      : DEFAULT_ERROR_MESSAGES[code];
  const fieldErrors = asRecord(input.fieldErrors) as
    Record<string, string[]> | undefined;

  return { code, message, fieldErrors, requestId: input.requestId };
}

export function fail<T = never>(error: ApiError): ApiResult<T> {
  return { ok: false, error };
}

export function ok<T>(data: T, requestId: string): ApiResult<T> {
  return { ok: true, data, requestId };
}
