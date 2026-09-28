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
    const items = itemsOfSet({}, row, none);

    expect(items).toEqual([{}]); // product of nothing is one item
  });

  it("builds all four combinations of two qualities and two corruption states, first property varying slowest", () => {
    const set = { Quality: { values: [0, 20] }, Corrupted: { values: [true, false] } };

    const items = itemsOfSet(set, row, none);

    expect(items).toEqual([
      { Quality: 0, Corrupted: true },
      { Quality: 0, Corrupted: false },
      { Quality: 20, Corrupted: true },
      { Quality: 20, Corrupted: false },
    ]);
  });

  it("uses the row's name for a property that reads it", () => {
    const items = itemsOfSet({ BaseType: { from: "name" } }, row, none);

    expect(items).toEqual([{ BaseType: "Hubris Circlet" }]);
  });

  it("builds one item per base type for a property that reads the base types", () => {
    const items = itemsOfSet({ BaseType: { from: "baseTypes" } }, row, none);

    expect(items).toEqual([{ BaseType: "A" }, { BaseType: "B" }]);
  });

  it("builds one item per value the row's conditions hold for a property that reads them", () => {
    const lookup = () => new Map([["ItemLevel", [75, 86]]]);

    const items = itemsOfSet({ ItemLevel: { from: "conditions" } }, row, lookup);

    expect(items).toEqual([{ ItemLevel: 75 }, { ItemLevel: 86 }]);
  });

  it("never looks up the row's conditions when no property reads them", () => {
    let calls = 0;
    const lookup = () => {
      calls++;
      return new Map<string, readonly unknown[]>();
    };

    itemsOfSet({ Quality: { values: [1] } }, row, lookup);

    expect(calls).toBe(0); // lookup is lazy; resolving is the expensive part
  });

  it("leaves out a property read off the row that has no values, rather than building no items", () => {
    const set = { ItemLevel: { from: "conditions" as const }, Corrupted: { values: [true] } };

    const items = itemsOfSet(set, row, none);

    expect(items).toEqual([{ Corrupted: true }]); // an empty factor would zero the product
  });

  it("drops a value read off the row that does not fit its condition", () => {
    const lookup = () => new Map([["Quality", ["high", 20]]]);

    const items = itemsOfSet({ Quality: { from: "conditions" } }, row, lookup);

    expect(items).toEqual([{ Quality: 20 }]); // silently, unlike a literal
  });

  it("throws on a written value that does not fit its condition", () => {
    const build = () => itemsOfSet({ Quality: { values: ["bad"] } }, row, none);

    expect(build).toThrow("sample value \"bad\" does not fit Quality"); // an authoring mistake
  });

  it("throws on a property that is not a filter condition", () => {
    const build = () => itemsOfSet({ NotACondition: { values: [1] } }, row, none);

    expect(build).toThrow("sample set names \"NotACondition\", which is not a filter condition");
  });
});
