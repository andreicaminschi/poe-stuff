import { describe, it, expect } from "@jest/globals";
import { statIndex, statKey } from "./stat-index.ts";

describe("statKey", () => {
  it("writes a spelled range and a placeholder the same way", () => {
    expect(statKey("Adds (2-3) to (4-5) Cold Damage")).toBe(statKey("Adds # to # Cold Damage"));
  });

  it("drops the sign in front of a number", () => {
    expect(statKey("+30 to Dexterity")).toBe("# to dexterity");
  });

  it("reads an article as a count", () => {
    expect(statKey("Fires an additional Arrow")).toBe(statKey("Fires # additional Arrows"));
  });

  it("collapses a newline into a single space", () => {
    expect(statKey("x\n  y")).toBe("x y");
  });

  it("keeps a lone word a that stands for no count", () => {
    expect(statKey("a b")).toBe("a b");
  });

  it("keeps the s of less but strips other trailing plurals", () => {
    expect(statKey("less Charges")).toBe("less charge");
  });

  it("keeps the s of has", () => {
    expect(statKey("Area has")).toBe("area has");
  });

  it("blanks literal numbers in the wording", () => {
    expect(statKey("per 10 Dexterity")).toBe(statKey("per 12 Dexterity"));
  });
});

describe("statIndex", () => {
  it("returns every item sharing a key in insertion order", () => {
    const index = statIndex(["+# to Life", "+# to life", "other"], (text) => text);

    expect(index.find("+149 to Life")).toEqual(["+# to Life", "+# to life"]);
  });

  it("returns an empty list when nothing shares the key", () => {
    expect(statIndex(["a"], (text) => text).find("b")).toEqual([]);
  });
});
