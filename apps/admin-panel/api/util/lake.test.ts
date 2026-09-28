import { describe, expect, it } from "@jest/globals";
import { resolve } from "node:path";
import { repoRoot } from "./lake.ts";

describe("repoRoot", () => {
  it("finds the repository two folders above the app", () => {
    const root = repoRoot("/work/poe-stuff/apps/admin-panel");

    expect(root).toBe(resolve("/work/poe-stuff"));
  }); // apps/<name> is exactly two levels deep

  it("finds the same repository when the app path ends in a slash", () => {
    const root = repoRoot("/work/poe-stuff/apps/admin-panel/");

    expect(root).toBe(resolve("/work/poe-stuff"));
  }); // resolve drops the trailing empty segment
});
