import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getPublicEnv } from "../env/public";

type ServerSupabaseClientOptions = {
  onAuthHeaders?: (headers: Record<string, string>) => void;
};

export async function createServerSupabaseClient(
  options: ServerSupabaseClientOptions = {},
): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component não pode gravar cookies; o proxy refresca a sessão.
        }
        options.onAuthHeaders?.(headers);
      },
    },
  });
}
