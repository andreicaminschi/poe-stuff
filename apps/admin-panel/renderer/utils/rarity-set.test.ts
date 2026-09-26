import { describe, it, expect } from "@jest/globals";
import { raritySet } from "./rarity-set.ts";

describe("raritySet", () => {
  it("lets through only the named rarities by default", () => {
    expect(raritySet({ condition: "Rarity", value: ["Rare", "Normal"] })).toEqual(["Normal", "Rare"]);
  });

  it("reads a single string and ignores case and spaces", () => {
    expect(raritySet({ condition: "Rarity", value: " rare " })).toEqual(["Rare"]);
  });

  it("reads > as everything above", () => {
    expect(raritySet({ condition: "Rarity", operator: ">", value: "Magic" })).toEqual(["Rare", "Unique"]);
  });

  it("reads >= as the rarity and everything above", () => {
    expect(raritySet({ condition: "Rarity", operator: ">=", value: "Magic" })).toEqual(["Magic", "Rare", "Unique"]);
  });

  it("reads < as everything below", () => {
    expect(raritySet({ condition: "Rarity", operator: "<", value: "Magic" })).toEqual(["Normal"]);
  });

  it("reads <= as the rarity and everything below", () => {
    expect(raritySet({ condition: "Rarity", operator: "<=", value: "Magic" })).toEqual(["Normal", "Magic"]);
  });

  it("reads ! and != as everything not named", () => {
    expect(raritySet({ condition: "Rarity", operator: "!", value: ["Normal", "Unique"] })).toEqual(["Magic", "Rare"]);
    expect(raritySet({ condition: "Rarity", operator: "!=", value: "Rare" })).toEqual(["Normal", "Magic", "Unique"]);
  });

  it("orders by only the first named rarity", () => {
    expect(raritySet({ condition: "Rarity", operator: ">=", value: ["Rare", "Normal"] })).toEqual(["Rare", "Unique"]);
  });

  it("skips names that are not rarities", () => {
    expect(raritySet({ condition: "Rarity", value: ["Legendary", "Magic"] })).toEqual(["Magic"]);
  });

  it("lets nothing through when no rarity is named", () => {
    expect(raritySet({ condition: "Rarity", operator: "!=", value: 3 })).toEqual([]);
  });
});
