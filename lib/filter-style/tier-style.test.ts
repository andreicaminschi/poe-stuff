import { describe, it, expect } from "@jest/globals";
import { HINT_BORDERS, tierStyle } from "./tier-style.ts";
import type { Palette } from "./types.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#0000ff", icon: "Star" };

describe("tierStyle", () => {
  describe("the ladder tiers", () => {
    it("draws the top tier extra large on white, with primary text and border, the largest icon and a beam", () => {
      const style = tierStyle(palette, "T0");

      expect(style).toEqual({
        size: "XL",
        fontSize: 45,
        opacity: 1,
        background: "#ffffff",
        text: "#ff0000",
        border: "#ff0000",
        icon: { size: 0, colour: "Red", shape: "Star" },
        beam: { colour: "Red" },
      }); // icon size 0 is the game's biggest
    });

    it("draws the second tier extra large on the primary, with secondary text, a medium icon and a beam", () => {
      const style = tierStyle(palette, "T1");

      expect(style).toEqual({
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

    it("draws the third tier large on the primary with a fifth of the secondary mixed in, and no icon or beam", () => {
      const style = tierStyle(palette, "T2");

      expect([style.size, style.background, style.text, style.icon, style.beam]).toEqual(["L", "#cc0033", "#0000ff", null, null]);
    });

    it.each([
      ["T3", "M", "#990066"],
      ["T4", "S", "#4d00b3"],
      ["T5", "XS", "#3300cc"],
    ] as const)("draws %s at size %s on %s, fading toward the secondary, with text and border matching", (name, size, background) => {
      const style = tierStyle(palette, name);

      expect([style.size, style.background, style.border === style.text, style.icon]).toEqual([size, background, true, null]); // text picked for contrast
    });
  });

  describe("the special buckets", () => {
    it("draws Want to see small on the primary with a beam and no icon", () => {
      const style = tierStyle(palette, "Want to see");

      expect([style.size, style.background, style.icon, style.beam]).toEqual(["S", "#ff0000", null, { colour: "Red" }]);
    });

    it("draws Unpriced medium on an even mix of primary and secondary", () => {
      const style = tierStyle(palette, "Unpriced");

      expect([style.size, style.background]).toEqual(["M", "#800080"]);
    });

    it("draws Hidden exactly like the lowest tier but at forty percent opacity", () => {
      const style = tierStyle(palette, "Hidden");

      expect(style).toEqual({ ...tierStyle(palette, "T5"), opacity: 0.4 });
    });
  });

  describe("hint borders", () => {
    it("keeps the tier's own border for an item worth taking", () => {
      const style = tierStyle(palette, "T0", "take");

      expect(style.border).toBe("#ff0000"); // take has no hint border
    });

    it.each(["check", "gamble"] as const)("replaces even Hidden's border with the %s colour", (verb) => {
      const style = tierStyle(palette, "Hidden", verb);

      expect(style.border).toBe(HINT_BORDERS[verb]); // applied after the bucket style
    });
  });
});
