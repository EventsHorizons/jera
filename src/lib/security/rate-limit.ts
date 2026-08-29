/**
 * In-memory sliding-window rate limiter for auth abuse protection (MVP).
 * Per-process only — sufficient for single-instance / local; upgrade later if multi-instance.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  const cutoff = now - windowMs;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    buckets.set(key, bucket);
    return { ok: false, retryAfterSeconds };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

/** Test helper — clears all buckets. */
export function resetRateLimits() {
  buckets.clear();
}

/** Clear one key (e.g. after a successful login). */
export function resetRateLimitsForKey(key: string) {
  buckets.delete(key);
}

export const AUTH_RATE_LIMITS = {
  register: { limit: 8, windowMs: 15 * 60 * 1000 },
  login: { limit: 20, windowMs: 15 * 60 * 1000 },
  loginEmail: { limit: 12, windowMs: 15 * 60 * 1000 },
  forgotPassword: { limit: 5, windowMs: 15 * 60 * 1000 },
  resendVerification: { limit: 3, windowMs: 60 * 60 * 1000 },
} as const;
