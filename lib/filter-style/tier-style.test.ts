import { describe, it, expect } from "@jest/globals";
import { HINT_BORDERS, tierStyle } from "./tier-style.ts";
import type { Palette } from "./types.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#0000ff", icon: "Star" };

describe("tierStyle", () => {
  describe("the top tier", () => {
    it("draws on white with primary text and border, a large icon and a beam", () => {
      expect(tierStyle(palette, "T0")).toEqual({
        size: "XL",
        fontSize: 45,
        opacity: 1,
        background: "#ffffff",
        text: "#ff0000",
        border: "#ff0000",
        icon: { size: 0, colour: "Red", shape: "Star" },
        beam: { colour: "Red" },
      });
    });
  });

  describe("the second tier", () => {
    it("draws on the primary with secondary text, a medium icon and a beam", () => {
      expect(tierStyle(palette, "T1")).toEqual({
        size: "XL",
        fontSize: 45,
        opacity: 1,
        background: "#ff0000",
        text: "#0000ff",
        border: "#0000ff",
        icon: { size: 1, colour: "Red", shape: "Star" },
        beam: { colour: "Red" },
      });
    });
  });

  describe("the third tier", () => {
    it("draws on a fifth of the secondary with no icon or beam", () => {
      const style = tierStyle(palette, "T2");

      expect([style.size, style.background, style.text, style.icon, style.beam]).toEqual([
        "L",
        "#cc0033",
        "#0000ff",
        null,
        null,
      ]);
    });
  });

  describe("the faded tiers", () => {
    it.each([
      ["T3", "M", "#990066"],
      ["T4", "S", "#4d00b3"],
      ["T5", "XS", "#3300cc"],
    ] as const)("draws %s at size %s on %s, with matching text and border", (name, size, background) => {
      const style = tierStyle(palette, name);

      expect(style.size).toBe(size);
      expect(style.background).toBe(background);
      expect(style.border).toBe(style.text);
      expect(style.icon).toBeNull();
    });
  });

  describe("the special buckets", () => {
    it("draws Want to see small on the primary with a beam and no icon", () => {
      const style = tierStyle(palette, "Want to see");

      expect([style.size, style.background, style.icon, style.beam]).toEqual(["S", "#ff0000", null, { colour: "Red" }]);
    });

    it("draws Unpriced on an even mix of primary and secondary", () => {
      const style = tierStyle(palette, "Unpriced");

      expect([style.size, style.background]).toEqual(["M", "#800080"]);
    });

    it("draws Hidden like the lowest tier but at forty percent opacity", () => {
      expect(tierStyle(palette, "Hidden")).toEqual({ ...tierStyle(palette, "T5"), opacity: 0.4 });
    });
  });

  describe("hint borders", () => {
    it("keeps the tier's own border for a take", () => {
      expect(tierStyle(palette, "T0", "take").border).toBe("#ff0000");
    });

    it.each(["check", "gamble"] as const)("replaces every bucket's border with the %s hint colour", (verb) => {
      expect(tierStyle(palette, "Hidden", verb).border).toBe(HINT_BORDERS[verb]);
    });
  });
});
