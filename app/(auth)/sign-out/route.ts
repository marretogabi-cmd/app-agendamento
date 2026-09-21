import { type NextRequest } from "next/server";
import { signOut } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAuthHeaderCollector,
  redirectWithAuthHeaders,
  signInErrorUrl,
} from "../route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const target = new URL("/sign-in", request.url);
  const collector = createAuthHeaderCollector();

  if (!hasPublicEnv()) {
    return redirectWithAuthHeaders(signInErrorUrl(request, "unavailable"), 303);
  }

  try {
    const supabase = await createServerSupabaseClient({
      onAuthHeaders: collector.onAuthHeaders,
    });
    const result = await signOut(supabase);
    if (!result.ok) {
      return redirectWithAuthHeaders(
        signInErrorUrl(request, "unavailable"),
        303,
        collector.headers,
      );
    }
  } catch {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "unavailable"),
      303,
      collector.headers,
    );
  }

  return redirectWithAuthHeaders(target, 303, collector.headers);
}
