import { describe, it, expect } from "@jest/globals";
import { withExcluded } from "./with-excluded.ts";
import { ggg } from "../test-helpers.ts";

describe("withExcluded", () => {
  it("marks the item excluded", () => {
    const item = withExcluded(ggg("a"), true);

    expect(item.excluded).toBe(true);
  });

  it("removes the flag when unexcluded instead of writing false", () => {
    const item = withExcluded(ggg("a", { excluded: true }), false);

    expect("excluded" in item).toBe(false); // keeps the saved file free of false flags
  });

  it("writes no flag when unexcluding an item that was never excluded", () => {
    const item = withExcluded(ggg("a"), false);

    expect("excluded" in item).toBe(false);
  });
});
