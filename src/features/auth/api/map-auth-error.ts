import type { AuthError } from "@supabase/supabase-js";
import type { ApiResult } from "@/types/api";
import { fail, newRequestId, toApiError } from "@/lib/api";

export const AUTH_ERROR_MESSAGE = "Não foi possível autenticar.";

export function mapAuthError<T = never>(error: AuthError): ApiResult<T> {
  const status = error.status === 422 || error.status === 400 ? 400 : 401;
  return fail(
    toApiError({
      code: status === 400 ? "VALIDATION" : "UNAUTHENTICATED",
      message: AUTH_ERROR_MESSAGE,
      requestId: newRequestId(),
      status,
    }),
  );
}
