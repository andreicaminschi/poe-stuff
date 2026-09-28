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
  it("shows 1234.5678c as 1,234.57c", () => {
    const text = worthText(placement({ take: 1234.5678 }));

    expect(text).toBe("1,234.57c");
  }); // en-US grouping, two decimals at most

  it("shows a price of zero as 0c rather than a dash", () => {
    const text = worthText(placement({ take: 0 }));

    expect(text).toBe("0c");
  }); // only undefined is a dash, not falsy

  it("shows a dash when the placement's verb has no price", () => {
    const text = worthText(placement({ take: 5 }, { verb: "check" }));

    expect(text).toBe("-");
  }); // reads the verb's price, not take's

  it("shows a stack from 5000 with no ceiling as 5000+", () => {
    const text = worthText(placement({}, { stack: { floor: 5000 } }));

    expect(text).toBe("stack 5000+");
  }); // no locale grouping on stack sizes

  it("shows a stack from 100 to 250 as a range and ignores the 3c price", () => {
    const text = worthText(placement({ take: 3 }, { stack: { floor: 100, ceiling: 250 } }));

    expect(text).toBe("stack 100-250");
  }); // stack wins over price
});
