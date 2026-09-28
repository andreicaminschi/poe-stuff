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
  describe("refusing unusable rules", () => {
    it("refuses to build with no rules at all", () => {
      const build = () => createLimiter([]);

      expect(build).toThrow(RangeError);
    }); // no rules is a parse failure, not unlimited

    it("refuses a rule that allows zero requests", () => {
      const build = () => createLimiter([{ max: 0, windowMs: 1000 }]);

      expect(build).toThrow(RangeError);
    }); // max must be at least one

    it("refuses a rule that allows one and a half requests", () => {
      const build = () => createLimiter([{ max: 1.5, windowMs: 1000 }]);

      expect(build).toThrow(RangeError);
    }); // max must be an integer

    it("refuses a window of zero milliseconds", () => {
      const build = () => createLimiter([{ max: 1, windowMs: 0 }]);

      expect(build).toThrow(RangeError);
    }); // window must be positive

    it("refuses a window that is not a number", () => {
      const build = () => createLimiter([{ max: 1, windowMs: NaN }]);

      expect(build).toThrow(RangeError);
    }); // !(NaN > 0) catches it
  });

  describe("taking slots", () => {
    it("lets three requests through at once when three fit the window", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);

      const at = track(limiter, 3);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0, 0, 0]);
    }); // bursts freely below the limit

    it("makes the fourth request wait until the first one is a full second old", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(999);
      const before = at.length;
      await jest.advanceTimersByTimeAsync(1);

      expect(before).toBe(3);
      expect(at).toEqual([0, 0, 0, 1_000]);
    }); // still blocked at 999ms, free at 1000ms

    it("serves three waiting callers in the order they asked", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 100 }]);
      const order: number[] = [];

      for (const n of [1, 2, 3]) void limiter.acquire().then(() => order.push(n));
      await jest.advanceTimersByTimeAsync(300);

      expect(order).toEqual([1, 2, 3]);
    }); // one promise chain, FIFO

    it("holds to whichever of two tiers is stricter at each moment", async () => {
      const limiter = createLimiter([
        { max: 2, windowMs: 100 },
        { max: 3, windowMs: 10_000 },
      ]);

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([0, 0, 100, 10_000]);
    }); // short tier delays the third, long tier the fourth

    it("explains nothing until a request has had to wait", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 12_000 }]);

      await limiter.acquire();

      expect(limiter.explainWait()).toBeUndefined();
    }); // no hold, no reason

    it("explains a full budget by its window in seconds and how much of it is spent", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 12_000 }]);

      track(limiter, 2);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("the 12s budget is full, 1 of 1 spent");
    }); // window rounded to whole seconds
  });

  describe("smoothing", () => {
    it("spaces requests a quarter second apart once a four-per-second tier is half full", async () => {
      const limiter = createLimiter([{ max: 4, windowMs: 1_000 }], {
        smoothAbove: 0.5,
      });

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(at).toEqual([0, 0, 250, 500]);
    }); // spacing is window / max from the last hit

    it("explains a smoothing hold as spreading out the budget", async () => {
      const limiter = createLimiter([{ max: 4, windowMs: 1_000 }], {
        smoothAbove: 0.5,
      });

      track(limiter, 3);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("spreading out the 1s budget, 2 of 4 spent");
    }); // distinct from a full budget

    it("bursts to the limit when no smoothing is asked for", async () => {
      const limiter = createLimiter([{ max: 4, windowMs: 1_000 }]);

      const at = track(limiter, 4);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0, 0, 0, 0]);
    }); // smoothAbove absent means no spacing
  });

  describe("penalties", () => {
    it("holds every caller for five seconds even with budget to spare", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(5);

      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(5_000);

      expect(at).toEqual([5_000, 5_000]);
    }); // a deadline, not a rule

    it("never lets a two-second penalty cut short a ten-second one already running", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(10);
      limiter.penalize(2);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([10_000]);
    }); // max of deadlines

    it("explains a two-and-a-half-second hold as a restriction with 3s left to run", async () => {
      const limiter = createLimiter([{ max: 100, windowMs: 1_000 }]);
      limiter.penalize(2.5);

      track(limiter, 1);
      await jest.advanceTimersByTimeAsync(0);

      expect(limiter.explainWait()).toBe("restriction, 3s left to run");
    }); // rounded up

    it("still charges requests made before a penalty once it lifts", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      await limiter.acquire();
      limiter.penalize(2);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([10_000]);
    }); // history survives the hold
  });

  describe("changing rules", () => {
    it("lets a caller already waiting on a ten-second window through at one second when the window shrinks", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(0);

      limiter.setRules([{ max: 1, windowMs: 1_000 }]);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(at).toEqual([0, 1_000]);
    }); // setRules wakes the sleeper to re-check

    it("rejects an empty rule list and keeps pacing by the old rules", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 1_000 }]);

      const replace = () => limiter.setRules([]);
      const at = track(limiter, 2);
      await jest.advanceTimersByTimeAsync(1_000);

      expect(replace).toThrow(RangeError);
      expect(at).toEqual([0, 1_000]);
    }); // validated before assignment
  });

  describe("what the server says was spent", () => {
    it("holds the next request until the server's two-second window expires when it reports the tier full", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);
      limiter.observe([{ hits: 3, windowSeconds: 2, restrictedSeconds: 0 }]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(2_000);

      expect(at).toEqual([2_000]);
    }); // unseen hits expire with the server's window, not ours

    it("charges only what the server counted beyond the requests it made itself", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);
      await limiter.acquire();
      await limiter.acquire();
      limiter.observe([{ hits: 2, windowSeconds: 1, restrictedSeconds: 0 }]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0]);
    }); // two reported minus two recorded is zero unseen

    it("matches the server's tiers to the rules by position, not by window length", async () => {
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
    }); // 5s state charged to the 60s rule

    it("forgets the server's count once a later report says nothing was spent", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 1_000 }]);
      limiter.observe([{ hits: 3, windowSeconds: 60, restrictedSeconds: 0 }]);
      limiter.observe([{ hits: 0, windowSeconds: 60, restrictedSeconds: 0 }]);

      const at = track(limiter, 1);
      await jest.advanceTimersByTimeAsync(0);

      expect(at).toEqual([0]);
    }); // each observe replaces, never adds
  });
});
