import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiResult } from "@/types/api";
import { fail, newRequestId, ok, toApiError } from "@/lib/api";

export async function signOut(
  client: SupabaseClient,
): Promise<ApiResult<{ signedOut: true }>> {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) {
    return fail(
      toApiError({
        code: "INTERNAL",
        message: "Não foi possível encerrar a sessão.",
        requestId: newRequestId(),
      }),
    );
  }
  return ok({ signedOut: true }, newRequestId());
}
