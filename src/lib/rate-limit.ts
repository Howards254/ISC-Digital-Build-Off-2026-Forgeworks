type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfter: number };

type RateLimitStore = Map<string, number[]>;

const globalForRateLimit = globalThis as typeof globalThis & {
  __vulcanRateLimits?: RateLimitStore;
};

const store =
  globalForRateLimit.__vulcanRateLimits ??
  (globalForRateLimit.__vulcanRateLimits = new Map<string, number[]>());

/**
 * Best-effort in-process limiter. Serverless instances do not share memory,
 * so this is a guard against accidental double taps rather than a hard quota.
 */
export function consumeScanLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recent.length >= limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((windowMs - (now - recent[0])) / 1000),
    );

    store.set(key, recent);
    return { ok: false, retryAfter };
  }

  recent.push(now);
  store.set(key, recent);

  if (store.size > 5_000) {
    for (const [storedKey, timestamps] of store) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
        store.delete(storedKey);
      }
    }
  }

  return { ok: true, remaining: limit - recent.length };
}
