import { describe, it, expect } from "@jest/globals";
import { withUnpriceable } from "./with-unpriceable.ts";
import { ggg } from "../test-helpers.ts";

describe("withUnpriceable", () => {
  it("marks the item unpriceable", () => {
    expect(withUnpriceable(ggg("a"), true).unpriceable).toBe(true);
  });

  it("removes the key when unset instead of writing false", () => {
    expect("unpriceable" in withUnpriceable(ggg("a", { unpriceable: true }), false)).toBe(false);
  });
});
