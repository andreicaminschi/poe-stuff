import { describe, it, expect } from "@jest/globals";
import { raritySet } from "./rarity-set.ts";

describe("raritySet", () => {
  it("lets through only the named rarities, in rarity order", () => {
    const set = raritySet({ condition: "Rarity", value: ["Rare", "Normal"] });

    expect(set).toEqual(["Normal", "Rare"]); // output follows the grammar's order, not the input's
  });

  it("reads a single string and ignores its case and spaces", () => {
    const set = raritySet({ condition: "Rarity", value: " rare " });

    expect(set).toEqual(["Rare"]); // returns the canonical spelling
  });

  it("reads greater-than as everything above", () => {
    const set = raritySet({ condition: "Rarity", operator: ">", value: "Magic" });

    expect(set).toEqual(["Rare", "Unique"]);
  });

  it("lets nothing through above Unique", () => {
    const set = raritySet({ condition: "Rarity", operator: ">", value: "Unique" });

    expect(set).toEqual([]); // slice past the end
  });

  it("reads at-least as the rarity and everything above", () => {
    const set = raritySet({ condition: "Rarity", operator: ">=", value: "Magic" });

    expect(set).toEqual(["Magic", "Rare", "Unique"]);
  });

  it("reads less-than as everything below", () => {
    const set = raritySet({ condition: "Rarity", operator: "<", value: "Magic" });

    expect(set).toEqual(["Normal"]);
  });

  it("lets nothing through below Normal", () => {
    const set = raritySet({ condition: "Rarity", operator: "<", value: "Normal" });

    expect(set).toEqual([]); // slice(0, 0)
  });

  it("reads at-most as the rarity and everything below", () => {
    const set = raritySet({ condition: "Rarity", operator: "<=", value: "Magic" });

    expect(set).toEqual(["Normal", "Magic"]);
  });

  it("reads a bang as everything not named", () => {
    const set = raritySet({ condition: "Rarity", operator: "!", value: ["Normal", "Unique"] });

    expect(set).toEqual(["Magic", "Rare"]); // excludes every named rarity, not just the first
  });

  it("reads not-equal as everything not named", () => {
    const set = raritySet({ condition: "Rarity", operator: "!=", value: "Rare" });

    expect(set).toEqual(["Normal", "Magic", "Unique"]);
  });

  it("orders a comparison by only the first named rarity", () => {
    const set = raritySet({ condition: "Rarity", operator: ">=", value: ["Rare", "Normal"] });

    expect(set).toEqual(["Rare", "Unique"]); // the second name is ignored
  });

  it("skips names that are not rarities", () => {
    const set = raritySet({ condition: "Rarity", value: ["Legendary", "Magic"] });

    expect(set).toEqual(["Magic"]);
  });

  it("orders by the first real rarity when an unknown name comes first", () => {
    const set = raritySet({ condition: "Rarity", operator: ">", value: ["Legendary", "Rare"] });

    expect(set).toEqual(["Unique"]); // unknown names are dropped before picking the first
  });

  it("lets nothing through a not-equal when the value is a number", () => {
    const set = raritySet({ condition: "Rarity", operator: "!=", value: 3 });

    expect(set).toEqual([]); // no named rarity returns early, even for a negation
  });

  it("lets nothing through when there is no value", () => {
    const set = raritySet({ condition: "Rarity" });

    expect(set).toEqual([]);
  });
});
