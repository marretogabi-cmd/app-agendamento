import { DEFAULT_ERROR_MESSAGES, redactSensitiveText } from "@/lib/api";
import type { ApiResult } from "@/types/api";

export function toPublicCancellationResult<T>(
  result: ApiResult<T>,
  token: string,
): ApiResult<T> {
  if (result.ok) {
    return result;
  }

  const redacted = redactSensitiveText(result.error.message);
  const withoutToken =
    token.length > 0 ? redacted.replaceAll(token, "[redacted]") : redacted;
  const message =
    result.error.code === "NOT_FOUND"
      ? DEFAULT_ERROR_MESSAGES.NOT_FOUND
      : withoutToken;

  return {
    ok: false,
    error: { ...result.error, message },
  };
}
