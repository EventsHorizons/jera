import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/security/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit", () => {
    expect(rateLimit("k", 3, 60_000, 1000).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, 1001).ok).toBe(true);
    expect(rateLimit("k", 3, 60_000, 1002).ok).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    rateLimit("k", 2, 60_000, 1000);
    rateLimit("k", 2, 60_000, 1001);
    const blocked = rateLimit("k", 2, 60_000, 1002);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("isolates keys", () => {
    rateLimit("a", 1, 60_000, 1000);
    expect(rateLimit("b", 1, 60_000, 1001).ok).toBe(true);
    expect(rateLimit("a", 1, 60_000, 1002).ok).toBe(false);
  });

  it("allows again after window slides", () => {
    rateLimit("k", 1, 1000, 1000);
    expect(rateLimit("k", 1, 1000, 1001).ok).toBe(false);
    expect(rateLimit("k", 1, 1000, 2001).ok).toBe(true);
  });
});
