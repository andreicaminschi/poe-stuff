import { describe, it, expect } from "@jest/globals";
import { fanOut } from "./fan-out.ts";

/** Lets pending jobs make progress without any real waiting. */
async function ticks(count: number): Promise<void> {
  for (let at = 0; at < count; at += 1) await Promise.resolve();
}

const names = (count: number): string[] =>
  Array.from({ length: count }, (_, at) => `type-${at}`);

describe("fanOut", () => {
  it("returns one result per name, in the order the names were given", async () => {
    const finished: string[] = [];

    const results = await fanOut(["a", "b", "c", "d"], async (name) => {
      await ticks(name === "a" ? 6 : 1);
      finished.push(name);
      return name.toUpperCase();
    });

    expect(results).toEqual(["A", "B", "C", "D"]);
    expect(finished[0]).not.toBe("a");
  });

  it("runs at most four jobs at once", async () => {
    const release: (() => void)[] = [];
    let running = 0;
    let peak = 0;

    const pending = fanOut(names(10), async (name) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise<void>((resolve) => release.push(resolve));
      running -= 1;
      return name;
    });
    await ticks(5);
    const peakWhileTheFirstBatchRan = peak;

    while (release.length > 0) {
      release.shift()?.();
      await ticks(3);
    }
    await pending;

    expect(peakWhileTheFirstBatchRan).toBe(4);
    expect(peak).toBe(4);
  });

  it("starts the fifth job only once one of the first four has finished", async () => {
    const release: (() => void)[] = [];
    const started: string[] = [];

    const pending = fanOut(names(5), async (name) => {
      started.push(name);
      await new Promise<void>((resolve) => release.push(resolve));
      return name;
    });
    await ticks(5);
    const startedWhileAllFourWereBusy = [...started];

    release.shift()?.();
    await ticks(5);
    const startedAfterOneFinished = [...started];

    while (release.length > 0) {
      release.shift()?.();
      await ticks(3);
    }
    await pending;

    expect(startedWhileAllFourWereBusy).toHaveLength(4);
    expect(startedAfterOneFinished).toHaveLength(5);
  });

  it("does no work and answers with nothing when there are no names", async () => {
    let calls = 0;

    const results = await fanOut([], async (name: string) => {
      calls += 1;
      return name;
    });

    expect(results).toEqual([]);
    expect(calls).toBe(0);
  });

  it("fails naming the job that threw, so a short market is never mistaken for a small one", async () => {
    const failing = fanOut(["a", "b", "c"], async (name) => {
      if (name === "c") throw new Error("boom");
      return name;
    });

    await expect(failing).rejects.toThrow("poe-ninja: c failed: boom");
  });

  it("keeps the original error as the cause of the one it throws", async () => {
    const boom = new Error("boom");

    const failure = await fanOut(["a"], async () => {
      throw boom;
    }).catch((error: unknown) => error);

    expect((failure as Error).cause).toBe(boom);
  });

  it("fails the caller at once while the jobs already running carry on to the end", async () => {
    const release: (() => void)[] = [];
    const seen: string[] = [];

    const failure = await fanOut(names(6), async (name) => {
      seen.push(name);
      if (name === "type-0") throw new Error("boom");
      await new Promise<void>((resolve) => release.push(resolve));
      return name;
    }).catch((error: unknown) => error);
    const seenWhenTheCallerFailed = [...seen];

    while (release.length > 0) {
      release.shift()?.();
      await ticks(3);
    }

    expect(failure).toBeInstanceOf(Error);
    expect(seenWhenTheCallerFailed).toHaveLength(4);
    expect(seen).toHaveLength(6);
  });
});
