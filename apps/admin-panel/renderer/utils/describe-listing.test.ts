import { describe, it, expect } from "@jest/globals";
import { describeListing } from "./describe-listing.ts";

describe("describeListing", () => {
  it("joins every part in a fixed order whatever order the query was written in", () => { // corruption is written first but shown last
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
    ).toBe(
      "Onyx · rare · ilvl 86 · 6L · L20 · Q23 · corrupted · T16 · tier 3 · 8 passives · shaper · synth · corrupted: a / b",
    );
  });

  it("leaves out zero links", () => { // zero links means unlinked, not worth a word
    expect(describeListing({ name: "a", linkCount: 0 })).toBe("a");
  });

  it("keeps a zero item level", () => { // zero is only dropped for links
    expect(describeListing({ itemLevel: 0 })).toBe("ilvl 0");
  });

  it("names the normal rarity for frame zero", () => { // frame 0 is falsy but still a rarity
    expect(describeListing({ name: "a", frame: 0 })).toBe("a · normal");
  });

  it("leaves out a frame that is not a rarity", () => { // frame 9 has no name, so an empty part is dropped
    expect(describeListing({ name: "a", frame: 9 })).toBe("a");
  });

  it("leaves out gem corruption and synthesis when they are false", () => { // only true earns a word
    expect(describeListing({ name: "a", gemIsCorrupted: false, synthesised: false })).toBe("a");
  });

  it("describes an empty listing as an empty string", () => { // degenerate input
    expect(describeListing({})).toBe("");
  });

  it("leaves out an empty name", () => { // no leading separator
    expect(describeListing({ name: "", tier: 1 })).toBe("tier 1");
  });
});
