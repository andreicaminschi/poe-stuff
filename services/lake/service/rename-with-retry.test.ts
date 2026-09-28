import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

const rename = jest.fn<(from: string, to: string) => Promise<void>>();
jest.unstable_mockModule("node:fs/promises", () => ({ rename }));
const { renameWithRetry } = await import("./rename-with-retry.ts");

const failure = (code: string): NodeJS.ErrnoException => Object.assign(new Error(code), { code });

beforeEach(() => {
  jest.useFakeTimers();
  rename.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("renameWithRetry", () => {
  describe("when Windows briefly locks the target", () => {
    it("moves the file once the lock clears on a later attempt", async () => {
      rename.mockRejectedValueOnce(failure("EPERM")).mockRejectedValueOnce(failure("EPERM")).mockResolvedValue();

      const moved = renameWithRetry("a.tmp", "a.json");
      await jest.runAllTimersAsync();

      await expect(moved).resolves.toBeUndefined();
    }); // two locked attempts, third lands

    it("treats an access-denied error as a lock too", async () => {
      rename.mockRejectedValueOnce(failure("EACCES")).mockResolvedValue();

      const moved = renameWithRetry("a.tmp", "a.json");
      await jest.runAllTimersAsync();

      await expect(moved).resolves.toBeUndefined();
    }); // Windows' other held-handle code
  });

  describe("when the failure is not a lock", () => {
    it("fails at once without trying the rename again", async () => {
      rename.mockRejectedValue(failure("ENOENT"));

      const moved = renameWithRetry("a.tmp", "a.json");

      await expect(moved).rejects.toMatchObject({ code: "ENOENT" });
      expect(rename).toHaveBeenCalledTimes(1);
    }); // no timer ever scheduled
  });

  describe("when the lock never clears", () => {
    it("still succeeds if the twentieth retry works", async () => {
      for (let n = 0; n < 20; n++) rename.mockRejectedValueOnce(failure("EPERM"));
      rename.mockResolvedValue();

      const moved = renameWithRetry("a.tmp", "a.json");
      await jest.runAllTimersAsync();

      await expect(moved).resolves.toBeUndefined();
    }); // attempt 21 is the last allowed

    it("gives up after twenty retries and reports the lock error", async () => {
      rename.mockRejectedValue(failure("EPERM"));

      const moved = renameWithRetry("a.tmp", "a.json");
      const outcome = expect(moved).rejects.toMatchObject({ code: "EPERM" });
      await jest.runAllTimersAsync();

      await outcome;
      expect(rename).toHaveBeenCalledTimes(21);
    }); // one past the edge
  });
});
