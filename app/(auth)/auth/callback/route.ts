import { type NextRequest } from "next/server";
import { normalizeNextPath } from "@/features/auth";
import { hasPublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAuthHeaderCollector,
  redirectWithAuthHeaders,
  signInErrorUrl,
} from "../../route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"));
  const collector = createAuthHeaderCollector();

  if (!hasPublicEnv()) {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "unavailable", nextPath),
      302,
    );
  }

  if (!code) {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "oauth_callback", nextPath),
      302,
    );
  }

  try {
    const supabase = await createServerSupabaseClient({
      onAuthHeaders: collector.onAuthHeaders,
    });
    const { error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );

    if (error) {
      return redirectWithAuthHeaders(
        signInErrorUrl(request, "oauth_callback", nextPath),
        302,
        collector.headers,
      );
    }
  } catch {
    return redirectWithAuthHeaders(
      signInErrorUrl(request, "oauth_callback", nextPath),
      302,
      collector.headers,
    );
  }

  return redirectWithAuthHeaders(
    new URL(nextPath, request.url),
    302,
    collector.headers,
  );
}
