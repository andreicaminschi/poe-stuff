import { describe, it, expect } from "@jest/globals";
import type { GggItem } from "../../api/taxonomy.types.ts";
import { withFlag } from "./with-flag.ts";

const item: GggItem = {
  source: "ggg",
  key: "a",
  name: "a",
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
  tradable: true,
};

describe("withFlag", () => {
  it("drops the field to take the sources' answer", () => {
    expect("tradable" in withFlag(item, "tradable", undefined)).toBe(false);
  });

  it("writes an explicit answer", () => {
    expect(withFlag(item, "filterable", false).filterable).toBe(false);
  });
});
