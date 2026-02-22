import { describe, expect, it, vi } from "vitest";

import { createInMemoryRateLimiter } from "@/lib/rate-limit";

describe("createInMemoryRateLimiter", () => {
  it("allows requests until the configured limit", async () => {
    const limiter = createInMemoryRateLimiter({
      requests: 2,
      windowMs: 60_000,
      prefix: "test-chat",
    });

    const first = await limiter.limit("user-1");
    const second = await limiter.limit("user-1");
    const third = await limiter.limit("user-1");

    expect(first.success).toBe(true);
    expect(first.remaining).toBe(1);

    expect(second.success).toBe(true);
    expect(second.remaining).toBe(0);

    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.limit).toBe(2);
  });

  it("resets the bucket after the window expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    try {
      const limiter = createInMemoryRateLimiter({
        requests: 1,
        windowMs: 1000,
        prefix: "test-voice",
      });

      const first = await limiter.limit("user-2");
      const blocked = await limiter.limit("user-2");

      vi.advanceTimersByTime(1001);

      const afterReset = await limiter.limit("user-2");

      expect(first.success).toBe(true);
      expect(blocked.success).toBe(false);
      expect(afterReset.success).toBe(true);
      expect(afterReset.remaining).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
