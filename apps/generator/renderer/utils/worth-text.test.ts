import { describe, it, expect } from "@jest/globals";
import type { Item, Placement } from "@poe/filter-style/types";
import { worthText } from "./worth-text.ts";

const placement = (prices: Item["prices"], extra: Partial<Placement> = {}): Placement => ({
  item: { name: "a", key: "a", category: "x", prices },
  bucket: "T1",
  verb: "take",
  reason: "",
  won: true,
  ...extra,
});

describe("worthText", () => {
  it("shows the price for the placement's verb, rounded to two places", () => {
    expect(worthText(placement({ take: 1234.5678 }))).toBe("1,234.57c");
  });

  it("shows a dash when the verb has no price", () => {
    expect(worthText(placement({ take: 5 }, { verb: "check" }))).toBe("-");
  });

  it("shows an open stack range with a plus", () => {
    expect(worthText(placement({}, { stack: { floor: 5000 } }))).toBe("stack 5000+");
  });

  it("shows a closed stack range, ignoring any price", () => {
    expect(worthText(placement({ take: 3 }, { stack: { floor: 100, ceiling: 250 } }))).toBe("stack 100-250");
  });
});
