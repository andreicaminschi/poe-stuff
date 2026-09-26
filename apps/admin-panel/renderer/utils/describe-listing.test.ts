import { describe, it, expect } from "@jest/globals";
import { describeListing } from "./describe-listing.ts";

describe("describeListing", () => {
  it("joins every part in a fixed order", () => {
    expect(
      describeListing({
        corruption: "a\nb",
        name: "Onyx",
        frame: 2,
        itemLevel: 86,
        linkCount: 6,
        gemLevel: 20,
        gemQuality: 23,
        gemIsCorrupted: true,
        mapTier: 16,
        tier: 3,
        passives: "8",
        influences: "shaper",
        synthesised: true,
      }),
    ).toBe("Onyx · rare · ilvl 86 · 6L · L20 · Q23 · corrupted · T16 · tier 3 · 8 passives · shaper · synth · corrupted: a / b");
  });

  it("leaves out zero links", () => {
    expect(describeListing({ name: "a", linkCount: 0 })).toBe("a");
  });

  it("keeps a zero item level", () => {
    expect(describeListing({ itemLevel: 0 })).toBe("ilvl 0");
  });

  it("leaves out a frame that is not a rarity", () => {
    expect(describeListing({ name: "a", frame: 9 })).toBe("a");
  });

  it("leaves out gem corruption and synthesis when they are false", () => {
    expect(describeListing({ name: "a", gemIsCorrupted: false, synthesised: false })).toBe("a");
  });

  it("describes an empty listing as an empty string", () => {
    expect(describeListing({})).toBe("");
  });

  it("leaves out an empty name", () => {
    expect(describeListing({ name: "", tier: 1 })).toBe("tier 1");
  });
});
