import { describe, it, expect } from "@jest/globals";
import { describeListing } from "./describe-listing.ts";

describe("describeListing", () => {
  it("tells a synthesised base from the plain one", () => {
    const plain = { name: "Ghastly Eye Jewel", frame: 0, itemLevel: 83, synthesised: false };

    expect(describeListing(plain)).toBe("Ghastly Eye Jewel · normal · ilvl 83");
    expect(describeListing({ ...plain, synthesised: true })).toBe("Ghastly Eye Jewel · normal · ilvl 83 · synth");
  });

  it("writes a gem's level, quality and corruption", () => {
    expect(describeListing({ name: "Empower Support", frame: 4, gemLevel: 4, gemQuality: 0, gemIsCorrupted: true })).toBe(
      "Empower Support · L4 · Q0 · corrupted",
    );
  });

  it("names influence and links, and skips zero links", () => {
    expect(describeListing({ name: "Vile Arrow Quiver", influences: "shaper", linkCount: 0 })).toBe(
      "Vile Arrow Quiver · shaper",
    );
    expect(describeListing({ name: "Tabula Rasa", frame: 3, linkCount: 6 })).toBe("Tabula Rasa · unique · 6L");
  });

  it("is only the name for an exchange listing", () => {
    expect(describeListing({ name: "Divine Orb" })).toBe("Divine Orb");
  });
});
