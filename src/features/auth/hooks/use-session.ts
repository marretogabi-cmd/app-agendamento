"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AuthSessionState } from "../types";

const pending: AuthSessionState = {
  status: "pending",
  session: null,
  user: null,
};

const signedOut: AuthSessionState = {
  status: "unauthenticated",
  session: null,
  user: null,
};

export function useSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(pending);

  useEffect(() => {
    const client = createBrowserSupabaseClient();

    client.auth
      .getSession()
      .then(({ data }) => {
        const session = data.session;
        setState({
          status: session ? "authenticated" : "unauthenticated",
          session,
          user: session?.user ?? null,
        });
      })
      .catch(() => {
        setState(signedOut);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setState({
          status: session ? "authenticated" : "unauthenticated",
          session,
          user: session?.user ?? null,
        });
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
