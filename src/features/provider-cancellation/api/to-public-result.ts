import { DEFAULT_ERROR_MESSAGES, redactSensitiveText } from "@/lib/api";
import type { ApiResult } from "@/types/api";

export function toPublicProviderCancelResult<T>(
  result: ApiResult<T>,
): ApiResult<T> {
  if (result.ok) {
    return result;
  }

  const message =
    result.error.code === "NOT_FOUND" || result.error.code === "UNAUTHORIZED"
      ? DEFAULT_ERROR_MESSAGES[result.error.code]
      : redactSensitiveText(result.error.message);

  return {
    ok: false,
    error: { ...result.error, message },
  };
}
