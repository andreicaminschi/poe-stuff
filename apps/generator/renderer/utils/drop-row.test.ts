import { describe, it, expect } from "@jest/globals";
import { tierStyle } from "@poe/filter-style/tier-style";
import type { Palette, Placement } from "@poe/filter-style/types";
import { dropRow } from "./drop-row.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#ffffff", icon: "Star" };
const one: Placement = {
  item: { name: "Mirror", key: "Mirror", category: "Currency", prices: { take: 5, check: 90 } },
  bucket: "T0",
  verb: "check",
  reason: "rolls high",
  won: false,
};

describe("dropRow", () => {
  it("keys the row by name, bucket and position so repeats stay distinct", () => {
    expect(dropRow(palette, one, 3).id).toBe("Mirror|T0|3");
  });

  it("styles the row for its bucket and verb and prices it by the verb", () => {
    expect(dropRow(palette, one, 0)).toEqual({
      id: "Mirror|T0|0",
      bucket: "T0",
      style: tierStyle(palette, "T0", "check"),
      won: false,
      name: "Mirror",
      worth: "90c",
      reason: "rolls high",
    });
  });
});
