import { describe, it, expect } from "@jest/globals";
import { sampleQuery } from "./sample-query.ts";

describe("sampleQuery", () => {
  it("is only the row name when the item carries nothing", () => {
    expect(sampleQuery("Exalted Orb", {})).toBe("Exalted Orb");
  });

  it("words the known properties in plain English", () => {
    const item = { GemLevel: 21, Quality: 20, Corrupted: true, LinkedSockets: 6, MapTier: 16, ItemLevel: 86 };

    expect(sampleQuery("X", item)).toBe(
      "X, gem level 21, quality 20, corrupted, 6 links, map tier 16, item level 86",
    );
  });

  it("drops a worded property whose value is zero or false", () => {
    expect(sampleQuery("X", { Quality: 0, GemLevel: 0, Corrupted: false })).toBe("X");
  });

  it("lists influences and drops an empty influence list", () => {
    expect(sampleQuery("X", { HasInfluence: ["Shaper", "Elder"] })).toBe("X, influence Shaper Elder");
    expect(sampleQuery("X", { HasInfluence: [] })).toBe("X");
  });

  it("skips a string base type that equals the row name", () => {
    expect(sampleQuery("Hubris Circlet", { BaseType: "Hubris Circlet" })).toBe("Hubris Circlet");
  });

  it("writes any other property by its condition name", () => {
    expect(sampleQuery("X", { StackSize: 10, Class: "Currency" })).toBe("X, StackSize 10, Class Currency");
  });

  it("drops any other property holding an empty list", () => {
    expect(sampleQuery("X", { HasExplicitMod: [] })).toBe("X");
  });
});
