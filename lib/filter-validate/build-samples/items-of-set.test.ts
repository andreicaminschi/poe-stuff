import { describe, it, expect } from "@jest/globals";
import { itemsOfSet } from "./items-of-set.ts";
import type { SampleRow } from "../types.ts";

const row: SampleRow = {
  key: "k",
  name: "Hubris Circlet",
  category: "armour",
  subcategory: "helmets",
  baseTypes: ["A", "B"],
};
const none = () => new Map<string, readonly unknown[]>();

describe("itemsOfSet", () => {
  it("builds one empty item from an empty set", () => {
    expect(itemsOfSet({}, row, none)).toEqual([{}]);
  });

  it("builds the cartesian product of every property's values", () => {
    const items = itemsOfSet({ Quality: { values: [0, 20] }, Corrupted: { values: [true, false] } }, row, none);

    expect(items).toEqual([
      { Quality: 0, Corrupted: true },
      { Quality: 0, Corrupted: false },
      { Quality: 20, Corrupted: true },
      { Quality: 20, Corrupted: false },
    ]);
  });

  it("reads values off the row's name and base types", () => {
    expect(itemsOfSet({ Rarity: { from: "name" } }, row, none)).toEqual([{ Rarity: "Hubris Circlet" }]);
    expect(itemsOfSet({ Rarity: { from: "baseTypes" } }, row, none)).toEqual([{ Rarity: "A" }, { Rarity: "B" }]);
  });

  it("reads values off the row's conditions only when asked", () => {
    let calls = 0;
    const lookup = () => {
      calls++;
      return new Map([["ItemLevel", [75, 86]]]);
    };

    expect(itemsOfSet({ ItemLevel: { from: "conditions" } }, row, lookup)).toEqual([
      { ItemLevel: 75 },
      { ItemLevel: 86 },
    ]);
    expect(itemsOfSet({ Quality: { values: [1] } }, row, lookup)).toEqual([{ Quality: 1 }]);
    expect(calls).toBe(1);
  });

  it("leaves out a property read off the row with no values instead of emptying the product", () => {
    const items = itemsOfSet({ ItemLevel: { from: "conditions" }, Corrupted: { values: [true] } }, row, none);

    expect(items).toEqual([{ Corrupted: true }]);
  });

  it("throws on a literal value that does not fit its condition", () => {
    expect(() => itemsOfSet({ Quality: { values: ["bad"] } }, row, none)).toThrow("does not fit Quality");
  });

  it("throws on a name that is not a filter condition", () => {
    expect(() => itemsOfSet({ NotACondition: { values: [1] } }, row, none)).toThrow("not a filter condition");
  });
});
