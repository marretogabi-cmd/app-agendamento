import { ApiError } from "./types.ts";

type RedisValue = { result?: unknown };

function redisConfig(): { url: string; token: string } | null {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL")?.replace(/\/$/, "");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN")?.trim();
  return url && token ? { url, token } : null;
}

async function command(parts: Array<string | number>): Promise<unknown> {
  const config = redisConfig();
  if (!config) return undefined;
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
  });
  if (!response.ok) throw new Error("redis unavailable");
  return ((await response.json()) as RedisValue).result;
}

async function providerVersion(providerId: string): Promise<string> {
  try {
    const value = await command(["GET", `availability-version:${providerId}`]);
    return typeof value === "string" ? value : "0";
  } catch {
    return "0";
  }
}

export async function readAvailabilityCache<T>(
  providerId: string,
  date: string,
): Promise<T | null> {
  if (!redisConfig()) return null;
  try {
    const version = await providerVersion(providerId);
    const value = await command([
      "GET",
      `availability:${providerId}:${version}:${date}`,
    ]);
    return typeof value === "string" ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export async function writeAvailabilityCache(
  providerId: string,
  date: string,
  value: unknown,
): Promise<void> {
  if (!redisConfig()) return;
  try {
    const version = await providerVersion(providerId);
    const ttl = Number(Deno.env.get("AVAILABILITY_CACHE_TTL_SECONDS") ?? 60);
    await command([
      "SET",
      `availability:${providerId}:${version}:${date}`,
      JSON.stringify(value),
      "EX",
      Number.isFinite(ttl) ? Math.max(10, Math.min(ttl, 900)) : 60,
    ]);
  } catch {
    // Cache is an optimization. PostgreSQL remains the source of truth.
  }
}

export async function invalidateAvailability(
  providerId: string,
): Promise<void> {
  if (!redisConfig()) return;
  try {
    await command(["INCR", `availability-version:${providerId}`]);
  } catch {
    // Versioned keys expire naturally; booking is always revalidated in PostgreSQL.
  }
}

async function hashIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function enforcePublicRateLimit(
  request: Request,
  scope: string,
  limit = 60,
): Promise<void> {
  if (!redisConfig()) return;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]
    ?.trim();
  const identifier = forwarded || request.headers.get("cf-connecting-ip") ||
    "unknown";
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `rate:${scope}:${bucket}:${await hashIdentifier(identifier)}`;
  try {
    const count = Number(await command(["INCR", key]));
    if (count === 1) await command(["EXPIRE", key, 70]);
    if (Number.isFinite(count) && count > limit) {
      throw new ApiError("UNAVAILABLE", 429, "Limite de requisições excedido.");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    // Rate-limit dependency failure must not make PostgreSQL unavailable.
  }
}
