import { describe, it, expect } from "@jest/globals";
import { composeLayers } from "./compose-layers.ts";

describe("composeLayers", () => {
  it("returns nothing when there are no layers", () => {
    expect(composeLayers([])).toEqual({ applied: [], removed: [] });
  });

  it("lets a lower level replace a condition with the same name and operator, recording the level it overrode", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "ItemLevel", operator: ">=", value: 60 }] },
      { level: "item", conditions: [{ condition: "ItemLevel", operator: ">=", value: 75 }] },
    ]);

    expect(result.applied).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 75, level: "item", overrides: ["category"] },
    ]);
  });

  it("keeps two conditions on the same name when their operators differ", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "GemLevel", operator: ">=", value: 3 }] },
      { level: "item", conditions: [{ condition: "GemLevel", operator: "<=", value: 4 }] },
    ]);

    expect(result.applied.map((c) => c.value)).toEqual([3, 4]);
  }); // operator is part of the key

  it("treats a missing operator the same as an explicit double equals", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "Rarity", value: "Rare" }] },
      { level: "item", conditions: [{ condition: "Rarity", operator: "==", value: "Unique" }] },
    ]);

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]?.overrides).toEqual(["category"]);
  });

  it("accumulates every overridden level when three levels set the same condition", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "Rarity", value: "Normal" }] },
      { level: "subcategory", conditions: [{ condition: "Rarity", value: "Magic" }] },
      { level: "item", conditions: [{ condition: "Rarity", value: "Rare" }] },
    ]);

    expect(result.applied[0]?.overrides).toEqual(["category", "subcategory"]);
  });

  it("removes an earlier condition when a lower level sets it to null, and records who removed it", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "Corrupted", value: false }] },
      { level: "subcategory", conditions: [{ condition: "Corrupted", value: true }] },
      { level: "item", conditions: [{ condition: "Corrupted", value: null }] },
    ]);

    expect(result.applied).toEqual([]);
    expect(result.removed).toEqual([{ condition: "Corrupted", value: true, level: "subcategory", removedBy: "item" }]);
  }); // overrides dropped from the removed record

  it("ignores a null removal when nothing earlier set that condition", () => {
    const result = composeLayers([{ level: "item", conditions: [{ condition: "Corrupted", value: null }] }]);

    expect(result).toEqual({ applied: [], removed: [] });
  });

  it("clears the removal when a condition is re-added after being removed", () => {
    const result = composeLayers([
      { level: "category", conditions: [{ condition: "Corrupted", value: false }] },
      { level: "subcategory", conditions: [{ condition: "Corrupted", value: null }] },
      { level: "item", conditions: [{ condition: "Corrupted", value: true }] },
    ]);

    expect(result.applied).toEqual([{ condition: "Corrupted", value: true, level: "item" }]);
    expect(result.removed).toEqual([]);
  });

  it("keeps the order in which each condition was first set, even after it is overridden", () => {
    const result = composeLayers([
      {
        level: "category",
        conditions: [
          { condition: "Class", value: "Rings" },
          { condition: "Rarity", value: "Rare" },
        ],
      },
      { level: "item", conditions: [{ condition: "Class", value: "Amulets" }] },
    ]);

    expect(result.applied.map((c) => c.condition)).toEqual(["Class", "Rarity"]);
  }); // Map keeps insertion slot
});
