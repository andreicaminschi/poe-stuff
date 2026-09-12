import { describe, it, expect } from "@jest/globals";
import type { Condition, GggItem } from "../../api/taxonomy/types.ts";
import { sharedConditions } from "./shared-conditions.ts";
import { withSharedConditions } from "./with-shared-conditions.ts";

const unique: Condition = { condition: "Rarity", operator: "==", value: "Unique" };
const level: Condition = { condition: "ItemLevel", operator: ">=", value: 84 };
const quality: Condition = { condition: "Quality", operator: ">=", value: 20 };

const item = (key: string, conditions: readonly Condition[]): GggItem => ({
  source: "ggg",
  key,
  name: key,
  classification: { category: "currency", subcategory: null },
  conditions,
  variants: [],
});

describe("sharedConditions", () => {
  it("keeps only what every item has, matched on value too", () => {
    const items = [item("a", [unique, level]), item("b", [level, unique, quality]), item("c", [unique, { ...level, value: 1 }])];

    expect(sharedConditions(items)).toEqual([unique]);
  });

  it("treats an absent operator as ==", () => {
    const items = [item("a", [{ condition: "Rarity", value: "Unique" }]), item("b", [unique])];

    expect(sharedConditions(items)).toHaveLength(1);
  });

  it("gives nothing for no items", () => {
    expect(sharedConditions([])).toEqual([]);
  });
});

describe("withSharedConditions", () => {
  it("swaps the shared set and keeps the item's own extras", () => {
    const next = withSharedConditions(item("b", [level, unique, quality]), [unique], [unique, quality]);

    expect(next.conditions).toEqual([level, quality, unique, quality]);
  });

  it("removes a shared condition that was deleted", () => {
    expect(withSharedConditions(item("a", [unique, level]), [unique], []).conditions).toEqual([level]);
  });

  it("leaves the item it was given untouched", () => {
    const original = item("a", [unique]);
    withSharedConditions(original, [unique], []);

    expect(original.conditions).toEqual([unique]);
  });
});
