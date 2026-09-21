"use client";

import { useAsyncAction } from "@/hooks/use-async-action";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { signInWithOAuth, signInWithPassword } from "../api/sign-in";
import type { OAuthProvider, PasswordCredentials } from "../types";

export function useSignIn() {
  const password = useAsyncAction((credentials: PasswordCredentials) =>
    signInWithPassword(createBrowserSupabaseClient(), credentials),
  );
  const oauth = useAsyncAction((provider: OAuthProvider) =>
    signInWithOAuth(createBrowserSupabaseClient(), {
      provider,
      redirectTo: window.location.origin,
    }),
  );

  return {
    password: {
      status: password.status,
      error: password.error,
      data: password.data,
    },
    oauth: { status: oauth.status, error: oauth.error, data: oauth.data },
    signInWithPassword: password.run,
    signInWithOAuth: oauth.run,
  };
}
