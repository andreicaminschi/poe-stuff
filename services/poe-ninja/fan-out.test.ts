import { describe, expect, it } from "@jest/globals";
import { fanOut } from "./fan-out.ts";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise((done) => setImmediate(done));

describe("fanOut", () => {
  it("answers an empty list with an empty list and runs nothing", async () => {
    let calls = 0;

    const results = await fanOut([], async () => (calls += 1));

    expect(results).toEqual([]);
    expect(calls).toBe(0);
  });

  it("returns results in name order even when later names finish first", async () => {
    const waits = new Map([["a", 30], ["b", 10], ["c", 0]]);

    const results = await fanOut(["a", "b", "c"], async (name) => {
      await new Promise((done) => setTimeout(done, waits.get(name)));
      return name.toUpperCase();
    });

    expect(results).toEqual(["A", "B", "C"]);
  });

  it("never runs more than four jobs at once", async () => {
    const gates = Array.from({ length: 6 }, () => deferred<number>());
    const started: number[] = [];

    const pending = fanOut(["0", "1", "2", "3", "4", "5"], (name) => {
      started.push(Number(name));
      return gates[Number(name)]!.promise;
    });
    await flush();
    const firstWave = [...started];
    gates[2]!.resolve(2);
    await flush();
    const afterOne = [...started];
    gates.forEach((gate, at) => gate.resolve(at));

    expect(firstWave).toEqual([0, 1, 2, 3]);
    expect(afterOne).toEqual([0, 1, 2, 3, 4]);
    await expect(pending).resolves.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("fails with the failing name in the message and the original error as its cause", async () => {
    const original = new Error("boom");

    const error = (await fanOut(["Oil", "Scarab"], async (name) => {
      if (name === "Scarab") throw original;
      return 1;
    }).catch((caught: unknown) => caught)) as Error;

    expect(error.message).toBe("poe-ninja: Scarab failed: boom");
    expect(error.cause).toBe(original);
  });

  it("stringifies a thrown non-error into the message", async () => {
    const error = (await fanOut(["x"], async () => {
      throw "plain"; // eslint-disable-line @typescript-eslint/only-throw-error
    }).catch((caught: unknown) => caught)) as Error;

    expect(error.message).toBe("poe-ninja: x failed: plain");
  });

  it("keeps the other workers taking names after the caller has been failed", async () => {
    const seen: string[] = [];

    const pending = fanOut(["bad", "b", "c", "d", "e", "f"], async (name) => {
      seen.push(name);
      if (name === "bad") throw new Error("no");
      await flush();
      return name;
    });
    await expect(pending).rejects.toThrow("bad failed");
    for (let at = 0; at < 5; at += 1) await flush();

    expect(seen.sort()).toEqual(["b", "bad", "c", "d", "e", "f"]);
  });
});
