import { type NextRequest } from "next/server";
import { normalizeNextPath, refreshSession } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAuthHeaderCollector,
  redirectWithAuthHeaders,
  signInErrorUrl,
} from "../route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"));
  const collector = createAuthHeaderCollector();

  if (!hasPublicEnv()) {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "unavailable", nextPath),
      303,
    );
  }

  try {
    const supabase = await createServerSupabaseClient({
      onAuthHeaders: collector.onAuthHeaders,
    });
    const result = await refreshSession(supabase);
    if (!result.ok) {
      const error =
        result.error.code === "UNAVAILABLE" ? "unavailable" : "session_expired";
      return redirectWithAuthHeaders(
        signInErrorUrl(request, error, nextPath),
        303,
        collector.headers,
      );
    }
  } catch {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "unavailable", nextPath),
      303,
      collector.headers,
    );
  }

  return redirectWithAuthHeaders(
    new URL(nextPath, request.url),
    303,
    collector.headers,
  );
}
