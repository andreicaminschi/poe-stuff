import { describe, it, expect } from "@jest/globals";
import { resolve } from "node:path";
import { repoRoot } from "./lake.ts";

describe("repoRoot", () => {
  it("finds the repository two folders above the app's folder", () => {
    const root = repoRoot(resolve("/repo/apps/generator"));

    expect(root).toBe(resolve("/repo"));
  }); // apps/<name> is always two levels deep
});
