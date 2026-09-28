import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { sleep } from "./sleep.ts";

describe("sleep", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is still waiting one millisecond before a one-second delay is up", async () => {
    let done = false;
    void sleep(1000).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(999);

    expect(done).toBe(false); // edge minus one
  });

  it("finishes exactly when a one-second delay is up", async () => {
    let done = false;
    void sleep(1000).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(1000);

    expect(done).toBe(true); // edge itself
  });

  it("does not finish a zero delay synchronously", async () => {
    let done = false;
    void sleep(0).then(() => (done = true));

    await Promise.resolve();

    expect(done).toBe(false); // still a macrotask
  });

  it("finishes a zero delay on the next timer tick", async () => {
    let done = false;
    void sleep(0).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(0);

    expect(done).toBe(true);
  });

  it("treats a negative delay like zero", async () => {
    let done = false;
    void sleep(-50).then(() => (done = true));

    await jest.advanceTimersByTimeAsync(0);

    expect(done).toBe(true); // setTimeout clamps below zero
  });
});
