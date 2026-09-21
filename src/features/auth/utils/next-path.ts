const SAFE_ORIGIN = "https://app.local";

export function normalizeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const url = new URL(candidate, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function createAuthCallbackUrl(
  origin: string,
  nextPath: string,
): string {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", normalizeNextPath(nextPath));
  return callbackUrl.toString();
}

export function createAuthPageHref(
  pathname: "/sign-in" | "/register",
  nextPath: string,
): string {
  const safeNextPath = normalizeNextPath(nextPath);
  if (safeNextPath === "/") {
    return pathname;
  }
  return `${pathname}?next=${encodeURIComponent(safeNextPath)}`;
}
