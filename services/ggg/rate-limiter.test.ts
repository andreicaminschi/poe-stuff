import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { createLimiter } from "./rate-limiter.ts";
import type { RateLimiter } from "./types.ts";

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

function track(limiter: RateLimiter, count: number): number[] {
  const at: number[] = [];
  for (let i = 0; i < count; i++) {
    void limiter.acquire().then(() => {
      at.push(Date.now() - 1_000_000);
    });
  }
  return at;
}

describe("createLimiter", () => {
  it("refuses an empty rule list", () => {
    expect(() => createLimiter([])).toThrow(RangeError);
  });

  it("refuses a rule allowing zero or a fractional number of requests", () => {
    expect(() => createLimiter([{ max: 0, windowMs: 1000 }])).toThrow(RangeError);
    expect(() => createLimiter([{ max: 1.5, windowMs: 1000 }])).toThrow(RangeError);
  });

  it("refuses a window that is zero or not a number", () => {
    expect(() => createLimiter([{ max: 1, windowMs: 0 }])).toThrow(RangeError);
    expect(() => createLimiter([{ max: 1, windowMs: NaN }])).toThrow(RangeError);
  });

  describe("acquire", () => {
    it("lets three requests through at once when three fit the window", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);

      const at = track(limiter, 3);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0, 0, 0]);
    });

    it("makes the fourth request wait until the first is one window old", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(999);
      expect(at).toHaveLength(3);
      await jest.advanceTimersByTimeAsync(1);

      expect(at).toEqual([0, 0, 0, 1_000]);
    });

    it("serves waiting callers in the order they asked", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 100 }]);
      const order: number[] = [];

      for (const n of [1, 2, 3]) void limiter.acquire().then(() => order.push(n));
      await jest.advanceTimersByTimeAsync(300);

      expect(order).toEqual([1, 2, 3]);
    });

    it("holds to the strictest of two tiers", async () => {
      const limiter = createLimiter([
        { max: 2, windowMs: 100 },
        { max: 3, windowMs: 10_000 },
      ]);

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([0, 0, 100, 10_000]);
    });

    it("explains nothing until a request has had to wait", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 12_000 }]);

      await limiter.acquire();

      expect(limiter.explainWait()).toBeUndefined();
    });

    it("explains a full budget with its window in seconds and how much is spent", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 12_000 }]);

      track(limiter, 2);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("the 12s budget is full, 1 of 1 spent");
    });
  });

  describe("smoothing", () => {
    it("spaces requests at the window's own rate once the tier is half full", async () => {
      const limiter = createLimiter([{ max: 4, windowMs: 1_000 }], {
        smoothAbove: 0.5,
      });

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(at).toEqual([0, 0, 250, 500]);
    });

    it("explains a smoothing hold as spreading out the budget", async () => {
      const limiter = createLimiter([{ max: 4, windowMs: 1_000 }], {
        smoothAbove: 0.5,
      });

      track(limiter, 3);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("spreading out the 1s budget, 2 of 4 spent");
    });
  });

  describe("penalize", () => {
    it("holds every caller for the named seconds even with budget to spare", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(5);

      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(5_000);

      expect(at).toEqual([5_000, 5_000]);
    });

    it("never shortens a longer hold already running", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(10);
      limiter.penalize(2);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([10_000]);
    });

    it("explains a hold as a restriction with the seconds left, rounded up", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(2.5);

      track(limiter, 1);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("restriction, 3s left to run");
    });
  });

  describe("setRules", () => {
    it("applies new rules to a caller that is already waiting", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(0);

      limiter.setRules([{ max: 1, windowMs: 1_000 }]);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([0, 1_000]);
    });

    it("rejects an unusable list and keeps the old rules", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 1_000 }]);

      expect(() => limiter.setRules([])).toThrow(RangeError);
      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(at).toEqual([0, 1_000]);
    });
  });

  describe("observe", () => {
    it("charges hits the server counted but this limiter never made", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);
      limiter.observe([{ hits: 3, windowSeconds: 2, restrictedSeconds: 0 }]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(2_000);

      // Freed when the server's 2s window expires
      expect(at).toEqual([2_000]);
    });

    it("charges only the difference over hits it recorded itself", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);
      await limiter.acquire();
      await limiter.acquire();
      limiter.observe([{ hits: 2, windowSeconds: 1, restrictedSeconds: 0 }]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0]);
    });

    it("matches server tiers to rules by position, not by window length", async () => {
      const limiter = createLimiter([
        { max: 100, windowMs: 1_000 },
        { max: 2, windowMs: 60_000 },
      ]);
      limiter.observe([
        { hits: 0, windowSeconds: 1, restrictedSeconds: 0 },
        { hits: 2, windowSeconds: 5, restrictedSeconds: 0 },
      ]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(5_000);

      expect(at).toEqual([5_000]);
    });
  });
});
