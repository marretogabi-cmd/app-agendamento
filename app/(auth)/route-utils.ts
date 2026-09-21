import { NextResponse, type NextRequest } from "next/server";
import { applyAuthResponseHeaders, normalizeNextPath } from "@/features/auth";

export function createAuthHeaderCollector() {
  const headers = new Headers();

  return {
    headers,
    onAuthHeaders(values: Record<string, string>) {
      Object.entries(values).forEach(([name, value]) => {
        headers.set(name, value);
      });
    },
  };
}

export function redirectWithAuthHeaders(
  location: URL,
  status: 302 | 303,
  authHeaders?: Headers,
): NextResponse {
  const response = NextResponse.redirect(location, { status });
  applyAuthResponseHeaders(response.headers, authHeaders);
  return response;
}

export function signInErrorUrl(
  request: NextRequest,
  error: "oauth_callback" | "session_expired" | "unavailable",
  nextPath = "/",
): URL {
  const url = new URL("/sign-in", request.url);
  const safeNextPath = normalizeNextPath(nextPath);
  url.searchParams.set("error", error);
  if (safeNextPath !== "/") {
    url.searchParams.set("next", safeNextPath);
  }
  return url;
}
