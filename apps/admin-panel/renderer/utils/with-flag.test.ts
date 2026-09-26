import { describe, it, expect } from "@jest/globals";
import { withFlag } from "./with-flag.ts";
import { ggg } from "../test-helpers.ts";

describe("withFlag", () => {
  it("writes false as an explicit value, unlike the other toggles", () => {
    expect(withFlag(ggg("a"), "tradable", false).tradable).toBe(false);
  });

  it("removes the key when the value is cleared", () => {
    expect("filterable" in withFlag(ggg("a", { filterable: true }), "filterable", undefined)).toBe(false);
  });

  it("touches only the named flag", () => {
    const item = withFlag(ggg("a", { tradable: true }), "tradedOnExchange", true);

    expect(item.tradable).toBe(true);
  });
});
