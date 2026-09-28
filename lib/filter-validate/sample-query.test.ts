import { describe, it, expect } from "@jest/globals";
import { sampleQuery } from "./sample-query.ts";

describe("sampleQuery", () => {
  it("is just the row's name when the item carries nothing", () => {
    const query = sampleQuery("Exalted Orb", {});

    expect(query).toBe("Exalted Orb");
  });

  it("words gem level, quality, corruption, links, map tier and item level in plain English", () => {
    const item = { GemLevel: 21, Quality: 20, Corrupted: true, LinkedSockets: 6, MapTier: 16, ItemLevel: 86 };

    const query = sampleQuery("X", item);

    expect(query).toBe("X, gem level 21, quality 20, corrupted, 6 links, map tier 16, item level 86");
  });

  it("leaves out a worded property that is zero or false", () => {
    const query = sampleQuery("X", { Quality: 0, GemLevel: 0, Corrupted: false });

    expect(query).toBe("X"); // 0 quality is the default, not worth searching
  });

  it("lists two influences after the word influence", () => {
    const query = sampleQuery("X", { HasInfluence: ["Shaper", "Elder"] });

    expect(query).toBe("X, influence Shaper Elder");
  });

  it("leaves out an empty influence list", () => {
    const query = sampleQuery("X", { HasInfluence: [] });

    expect(query).toBe("X");
  });

  it("leaves out a base type that is the same as the row's name", () => {
    const query = sampleQuery("Hubris Circlet", { BaseType: "Hubris Circlet" });

    expect(query).toBe("Hubris Circlet"); // would repeat the name
  });

  it("keeps a base type that differs from the row's name", () => {
    const query = sampleQuery("Kaom's Heart", { BaseType: "Glorious Plate" });

    expect(query).toBe("Kaom's Heart, BaseType Glorious Plate");
  });

  it("writes any other property by its condition name and value", () => {
    const query = sampleQuery("X", { StackSize: 10, Class: "Currency" });

    expect(query).toBe("X, StackSize 10, Class Currency");
  });

  it("leaves out any other property holding an empty list", () => {
    const query = sampleQuery("X", { HasExplicitMod: [] });

    expect(query).toBe("X");
  });
});
