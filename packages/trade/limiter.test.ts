import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { createLimiter } from "./limiter.ts";

// Every test drives the clock by hand, starting from 0 so the arithmetic in the
// assertions is readable.
beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

// acquire() only ever resolves, so "did it get a slot yet?" is the observable we assert
// on. Reading .done is only meaningful after the timers have been advanced, because the
// resolution happens on the microtask queue.
function watch(promise: Promise<void>) {
  const state = { done: false };
  void promise.then(() => {
    state.done = true;
  });
  return state;
}

function watchMany(count: number, start: () => Promise<void>) {
  return Array.from({ length: count }, () => watch(start()));
}

const allDone = (states: { done: boolean }[]) => states.every((s) => s.done);

describe("createLimiter", () => {
  describe("acquire", () => {
    it("lets the very first request through without any waiting", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);

      const first = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      expect(first.done).toBe(true);
    });

    it("lets five requests through back to back when the rule allows five per ten seconds", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);

      const requests = watchMany(5, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      expect(allDone(requests)).toBe(true);
    });

    it("makes the sixth request wait until the first one is ten seconds old", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);
      watchMany(5, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      const sixth = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(5_000);

      expect(sixth.done).toBe(false);

      await jest.advanceTimersByTimeAsync(5_000);

      expect(sixth.done).toBe(true);
    });

    it("releases that sixth request the moment the first turns ten seconds old, not a tick later", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);
      watchMany(5, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      const sixth = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(9_999);

      expect(sixth.done).toBe(false);

      await jest.advanceTimersByTimeAsync(1);

      expect(sixth.done).toBe(true);
    });

    it("serves requests in the order they were made when several ask at the same time", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 1_000 }]);
      const served: string[] = [];

      const requests = ["first", "second", "third"].map((name) =>
        limiter.acquire().then(() => {
          served.push(name);
        }),
      );
      await jest.advanceTimersByTimeAsync(3_000);
      await Promise.all(requests);

      expect(served).toEqual(["first", "second", "third"]);
    });

    it("obeys the slower of two rules when a per-second and a per-minute limit both apply", async () => {
      const limiter = createLimiter([
        { max: 2, windowMs: 1_000 },
        { max: 2, windowMs: 60_000 },
      ]);
      watchMany(2, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      const third = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(1_000);

      expect(third.done).toBe(false);

      await jest.advanceTimersByTimeAsync(59_000);

      expect(third.done).toBe(true);
    });

    it("starts fresh after a quiet spell longer than the widest window", async () => {
      const limiter = createLimiter([{ max: 2, windowMs: 10_000 }]);
      watchMany(2, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(20_000);

      const afterTheGap = watchMany(2, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      expect(allDone(afterTheGap)).toBe(true);
    });

    it("refuses to be built without any rules", () => {
      expect(() => createLimiter([])).toThrow(RangeError);
    });

    it("refuses to be built with a rule that allows zero per window", () => {
      expect(() => createLimiter([{ max: 0, windowMs: 10_000 }])).toThrow(
        RangeError,
      );
    });
  });

  describe("setRules", () => {
    it("applies a tighter limit to requests that arrive after the change", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);
      watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      limiter.setRules([{ max: 1, windowMs: 10_000 }]);
      const afterTheChange = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(9_999);

      expect(afterTheChange.done).toBe(false);

      await jest.advanceTimersByTimeAsync(1);

      expect(afterTheChange.done).toBe(true);
    });

    it("leaves a request that is already waiting on its original schedule when limits are relaxed", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      watch(limiter.acquire());
      const waiting = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(5_000);

      limiter.setRules([{ max: 5, windowMs: 10_000 }]);
      await jest.advanceTimersByTimeAsync(4_999);

      expect(waiting.done).toBe(false);

      await jest.advanceTimersByTimeAsync(1);

      expect(waiting.done).toBe(true);
    });

    it("re-checks the current limits when a waiting request wakes up, and can hold it longer", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      watch(limiter.acquire());
      const waiting = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(5_000);

      limiter.setRules([{ max: 1, windowMs: 30_000 }]);
      await jest.advanceTimersByTimeAsync(5_000);

      expect(waiting.done).toBe(false);

      await jest.advanceTimersByTimeAsync(20_000);

      expect(waiting.done).toBe(true);
    });

    it("refuses a rule update that has no rules in it", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);

      expect(() => limiter.setRules([])).toThrow(RangeError);

      const stillLimited = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);
      const second = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      expect(stillLimited.done).toBe(true);
      expect(second.done).toBe(false);
    });
  });

  describe("penalize", () => {
    it("holds every request for thirty seconds after the server tells us to back off", async () => {
      const limiter = createLimiter([{ max: 5, windowMs: 10_000 }]);

      limiter.penalize(30);
      const held = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(29_999);

      expect(held.done).toBe(false);

      await jest.advanceTimersByTimeAsync(1);

      expect(held.done).toBe(true);
    });

    it("forgets earlier requests, so a full burst is allowed the moment the penalty ends", async () => {
      const limiter = createLimiter([{ max: 3, windowMs: 10_000 }]);
      watchMany(3, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      limiter.penalize(5);
      const afterThePenalty = watchMany(3, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(5_000);

      expect(allDone(afterThePenalty)).toBe(true);
    });

    it("catches a request that was already queued and waiting when the penalty lands", async () => {
      const limiter = createLimiter([{ max: 1, windowMs: 10_000 }]);
      watch(limiter.acquire());
      const queued = watch(limiter.acquire());
      await jest.advanceTimersByTimeAsync(5_000);

      limiter.penalize(30);
      await jest.advanceTimersByTimeAsync(5_000);

      expect(queued.done).toBe(false);

      await jest.advanceTimersByTimeAsync(25_000);

      expect(queued.done).toBe(true);
    });

    it("forgets earlier requests without delaying anything when the penalty is zero seconds", async () => {
      const limiter = createLimiter([{ max: 2, windowMs: 10_000 }]);
      watchMany(2, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      limiter.penalize(0);
      const afterTheReset = watchMany(2, () => limiter.acquire());
      await jest.advanceTimersByTimeAsync(0);

      expect(allDone(afterTheReset)).toBe(true);
    });
  });
});
