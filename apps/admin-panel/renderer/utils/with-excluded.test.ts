import { describe, it, expect } from "@jest/globals";
import { withExcluded } from "./with-excluded.ts";
import { ggg } from "../test-helpers.ts";

describe("withExcluded", () => {
  it("marks the item excluded", () => {
    expect(withExcluded(ggg("a"), true).excluded).toBe(true);
  });

  it("removes the key when unexcluded instead of writing false", () => {
    expect("excluded" in withExcluded(ggg("a", { excluded: true }), false)).toBe(false);
  });
});
