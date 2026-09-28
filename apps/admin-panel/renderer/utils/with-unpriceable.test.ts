import { describe, it, expect } from "@jest/globals";
import { withUnpriceable } from "./with-unpriceable.ts";
import { ggg } from "../test-helpers.ts";

describe("withUnpriceable", () => {
  it("marks the item unpriceable", () => {
    const item = withUnpriceable(ggg("a"), true);

    expect(item.unpriceable).toBe(true);
  });

  it("removes the flag when unset instead of writing false", () => {
    const item = withUnpriceable(ggg("a", { unpriceable: true }), false);

    expect("unpriceable" in item).toBe(false); // keeps the saved file free of false flags
  });
});
