import { describe, it, expect } from "@jest/globals";
import { toItemValue } from "./to-item-value.ts";

describe("toItemValue", () => {
  describe("influences", () => {
    it("wraps one influence in a list", () => {
      expect(toItemValue("HasInfluence", "Shaper")).toEqual(["Shaper"]); // items hold influences as a list
    });

    it("reads None, in any case, as no influence at all", () => {
      expect(toItemValue("HasInfluence", "none")).toEqual([]); // the filter's None means the empty list
    });

    it("refuses a number", () => {
      expect(toItemValue("HasInfluence", 3)).toBeUndefined();
    });
  });

  describe("mod counts", () => {
    it("wraps one mod name in a list", () => {
      expect(toItemValue("HasExplicitMod", "Tyrannical")).toEqual(["Tyrannical"]);
    });

    it("keeps a list of mod names as it is", () => {
      expect(toItemValue("HasExplicitMod", ["A", "B"])).toEqual(["A", "B"]);
    });

    it("refuses a list with a number in it", () => {
      expect(toItemValue("HasExplicitMod", ["A", 1])).toBeUndefined(); // every entry checked
    });
  });

  describe("transfigured gems", () => {
    it("turns false into a gem that is not transfigured", () => {
      expect(toItemValue("TransfiguredGem", false)).toBe(""); // empty name means not transfigured
    });

    it("turns true into a transfigured gem with a stand-in name", () => {
      expect(toItemValue("TransfiguredGem", true)).toBe("transfigured"); // any non-empty name
    });

    it("keeps a gem name as it is", () => {
      expect(toItemValue("TransfiguredGem", "Arc of Oscillating")).toBe("Arc of Oscillating");
    });
  });

  describe("yes-or-no conditions", () => {
    it("keeps true", () => {
      expect(toItemValue("Corrupted", true)).toBe(true);
    });

    it("refuses the word true written as text", () => {
      expect(toItemValue("Corrupted", "true")).toBeUndefined(); // no coercion
    });
  });

  describe("numbers", () => {
    it("keeps zero", () => {
      expect(toItemValue("Quality", 0)).toBe(0); // falsy but valid
    });

    it("refuses a number written as text", () => {
      expect(toItemValue("Quality", "20")).toBeUndefined();
    });
  });

  describe("everything else", () => {
    it("keeps a rarity as text", () => {
      expect(toItemValue("Rarity", "Unique")).toBe("Unique");
    });

    it("keeps a base type as text, not wrapped in a list", () => {
      expect(toItemValue("BaseType", "Hubris Circlet")).toBe("Hubris Circlet"); // unlike influences and mods
    });

    it("refuses a number where text belongs", () => {
      expect(toItemValue("BaseType", 1)).toBeUndefined();
    });
  });
});
