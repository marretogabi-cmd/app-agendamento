import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { ApiResult } from "@/types/api";
import { fail, newRequestId, ok, toApiError } from "@/lib/api";
import { AUTH_ERROR_MESSAGE, mapAuthError } from "./map-auth-error";
import type { OAuthProvider, PasswordCredentials } from "../types";

export async function signInWithPassword(
  client: SupabaseClient,
  credentials: PasswordCredentials,
): Promise<ApiResult<Session>> {
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error) {
    return mapAuthError(error);
  }
  if (!data.session) {
    return fail(
      toApiError({
        code: "UNAUTHENTICATED",
        message: AUTH_ERROR_MESSAGE,
        requestId: newRequestId(),
      }),
    );
  }
  return ok(data.session, newRequestId());
}

export async function signInWithOAuth(
  client: SupabaseClient,
  input: { provider: OAuthProvider; redirectTo: string },
): Promise<ApiResult<{ url: string }>> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: input.provider,
    options: {
      redirectTo: input.redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    return mapAuthError(error);
  }
  if (!data.url) {
    return fail(
      toApiError({
        code: "INTERNAL",
        requestId: newRequestId(),
      }),
    );
  }
  return ok({ url: data.url }, newRequestId());
}
