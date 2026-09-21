import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { ApiResult } from "@/types/api";
import { fail, newRequestId, ok, toApiError } from "@/lib/api";

export const REFRESH_ERROR_MESSAGE = "Não foi possível renovar a sessão.";

export async function refreshSession(
  client: SupabaseClient,
): Promise<ApiResult<Session>> {
  const { data, error } = await client.auth.refreshSession();

  if (error) {
    return fail(
      toApiError({
        code:
          error.status && error.status >= 500
            ? "UNAVAILABLE"
            : "UNAUTHENTICATED",
        message: REFRESH_ERROR_MESSAGE,
        requestId: newRequestId(),
      }),
    );
  }

  if (!data.session) {
    return fail(
      toApiError({
        code: "UNAUTHENTICATED",
        message: REFRESH_ERROR_MESSAGE,
        requestId: newRequestId(),
      }),
    );
  }

  return ok(data.session, newRequestId());
}
