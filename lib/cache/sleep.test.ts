import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { sleep } from "./sleep.ts";

describe("sleep", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays pending until one millisecond before the delay", async () => {
    let done = false;
    void sleep(1000).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(999);

    expect(done).toBe(false);
  });

  it("resolves exactly when the delay has passed", async () => {
    let done = false;
    void sleep(1000).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(1000);

    expect(done).toBe(true);
  });

  it("resolves a zero delay on the next timer tick, not synchronously", async () => {
    let done = false;
    void sleep(0).then(() => (done = true));

    await Promise.resolve();
    expect(done).toBe(false);

    await jest.advanceTimersByTimeAsync(0);
    expect(done).toBe(true);
  });

  it("treats a negative delay like zero", async () => {
    let done = false;
    void sleep(-50).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(0);

    expect(done).toBe(true);
  });
});
