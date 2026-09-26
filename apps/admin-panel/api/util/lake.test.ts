import { describe, expect, it } from "@jest/globals";
import { resolve } from "node:path";
import { repoRoot } from "./lake.ts";

describe("repoRoot", () => {
  it("finds the repository two folders above the app", () => {
    expect(repoRoot("/work/poe-stuff/apps/admin-panel")).toBe(resolve("/work/poe-stuff"));
  });
});
