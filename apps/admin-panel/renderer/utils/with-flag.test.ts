import { describe, it, expect } from "@jest/globals";
import { withFlag } from "./with-flag.ts";
import { ggg } from "../test-helpers.ts";

describe("withFlag", () => {
  it("writes false as an explicit value, unlike the other toggles", () => {
    const item = withFlag(ggg("a"), "tradable", false);

    expect(item.tradable).toBe(false); // false is an answer here; only undefined clears
  });

  it("removes the flag when the value is cleared", () => {
    const item = withFlag(ggg("a", { filterable: true }), "filterable", undefined);

    expect("filterable" in item).toBe(false); // deleted, not set to undefined
  });

  it("leaves the other flags as they were", () => {
    const item = withFlag(ggg("a", { tradable: true }), "tradedOnExchange", true);

    expect({ tradable: item.tradable, tradedOnExchange: item.tradedOnExchange }).toEqual({
      tradable: true,
      tradedOnExchange: true,
    });
  });
});
