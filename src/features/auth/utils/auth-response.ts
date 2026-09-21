export const AUTH_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export function applyAuthResponseHeaders(
  target: Headers,
  source?: Headers | Record<string, string>,
): void {
  Object.entries(AUTH_NO_STORE_HEADERS).forEach(([name, value]) => {
    target.set(name, value);
  });

  if (source instanceof Headers) {
    source.forEach((value, name) => target.set(name, value));
    return;
  }

  Object.entries(source ?? {}).forEach(([name, value]) => {
    target.set(name, value);
  });
}
