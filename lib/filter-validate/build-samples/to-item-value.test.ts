import { describe, it, expect } from "@jest/globals";
import { toItemValue } from "./to-item-value.ts";

describe("toItemValue", () => {
  it("wraps an influence name in a list and reads None as no influence", () => {
    expect(toItemValue("HasInfluence", "Shaper")).toEqual(["Shaper"]);
    expect(toItemValue("HasInfluence", "none")).toEqual([]);
    expect(toItemValue("HasInfluence", 3)).toBeUndefined();
  });

  it("accepts a mod name or a list of mod names for a counted condition", () => {
    expect(toItemValue("HasExplicitMod", "Tyrannical")).toEqual(["Tyrannical"]);
    expect(toItemValue("HasExplicitMod", ["A", "B"])).toEqual(["A", "B"]);
    expect(toItemValue("HasExplicitMod", ["A", 1])).toBeUndefined();
  });

  it("turns false into a non-transfigured gem and true into a transfigured one", () => {
    expect(toItemValue("TransfiguredGem", false)).toBe("");
    expect(toItemValue("TransfiguredGem", true)).toBe("transfigured");
    expect(toItemValue("TransfiguredGem", "Arc of Oscillating")).toBe("Arc of Oscillating");
  });

  it("keeps only booleans for a yes-or-no condition", () => {
    expect(toItemValue("Corrupted", true)).toBe(true);
    expect(toItemValue("Corrupted", "true")).toBeUndefined();
  });

  it("keeps only numbers for a numeric condition", () => {
    expect(toItemValue("Quality", 0)).toBe(0);
    expect(toItemValue("Quality", "20")).toBeUndefined();
  });

  it("keeps a string as is for any other condition", () => {
    expect(toItemValue("Rarity", "Unique")).toBe("Unique");
    expect(toItemValue("BaseType", "Hubris Circlet")).toBe("Hubris Circlet"); // not wrapped in a list
    expect(toItemValue("BaseType", 1)).toBeUndefined();
  });
});
