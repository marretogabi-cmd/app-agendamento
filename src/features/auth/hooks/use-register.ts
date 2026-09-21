"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { registerWithPassword } from "../api/register";
import { signInWithOAuth } from "../api/sign-in";
import type { OAuthProvider, RegistrationCredentials } from "../types";
import { createAuthCallbackUrl, normalizeNextPath } from "../utils/next-path";

export function useRegister(nextPath = "/") {
  const safeNextPath = normalizeNextPath(nextPath);
  const password = useAsyncAction((credentials: RegistrationCredentials) =>
    registerWithPassword(createBrowserSupabaseClient(), credentials, {
      emailRedirectTo: createAuthCallbackUrl(
        window.location.origin,
        safeNextPath,
      ),
    }),
  );
  const oauth = useAsyncAction((provider: OAuthProvider) =>
    signInWithOAuth(createBrowserSupabaseClient(), {
      provider,
      redirectTo: createAuthCallbackUrl(window.location.origin, safeNextPath),
    }),
  );

  return {
    password: {
      status: password.status,
      error: password.error,
      data: password.data,
    },
    oauth: { status: oauth.status, error: oauth.error, data: oauth.data },
    registerWithPassword: password.run,
    registerWithOAuth: oauth.run,
  };
}
