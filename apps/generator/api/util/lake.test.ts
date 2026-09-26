import { describe, it, expect } from "@jest/globals";
import { resolve } from "node:path";
import { repoRoot } from "./lake.ts";

describe("repoRoot", () => {
  it("climbs two folders above the app's path", () => {
    expect(repoRoot(resolve("/repo/apps/generator"))).toBe(resolve("/repo"));
  });
});
