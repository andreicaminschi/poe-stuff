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
  it("gives the same item dropped twice two different row ids", () => {
    const first = dropRow(palette, one, 0);

    const second = dropRow(palette, one, 1);

    expect([first.id, second.id]).toEqual(["Mirror|T0|0", "Mirror|T0|1"]);
  }); // position is in the id, so React keys never collide

  it("styles the row for its bucket and verb and shows the 90c check price rather than the 5c take", () => {
    const row = dropRow(palette, one, 0);

    expect(row).toEqual({
      id: "Mirror|T0|0",
      bucket: "T0",
      style: tierStyle(palette, "T0", "check"),
      won: false,
      name: "Mirror",
      worth: "90c",
      reason: "rolls high",
    });
  }); // verb drives both style and price
});
