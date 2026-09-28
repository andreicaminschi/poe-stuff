import { describe, it, expect } from "@jest/globals";
import { composeLayers } from "./compose-layers.ts";

describe("composeLayers", () => {
  it("applies and removes nothing when there are no layers", () => {
    const result = composeLayers([]);

    expect(result).toEqual({ applied: [], removed: [] }); // degenerate input
  });

  it("lets the item replace the category's item level floor and records that it overrode the category", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "ItemLevel", operator: ">=", value: 60 }] },
      { level: "item", conditions: [{ condition: "ItemLevel", operator: ">=", value: 75 }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied).toEqual([
      { condition: "ItemLevel", operator: ">=", value: 75, level: "item", overrides: ["category"] },
    ]); // key is name + operator
  });

  it("keeps a gem level floor and a gem level ceiling side by side", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "GemLevel", operator: ">=", value: 3 }] },
      { level: "item", conditions: [{ condition: "GemLevel", operator: "<=", value: 4 }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied.map((c) => c.value)).toEqual([3, 4]); // different operators, different keys
  });

  it("treats a condition with no operator as the same one written with double equals", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "Rarity", value: "Rare" }] },
      { level: "item", conditions: [{ condition: "Rarity", operator: "==", value: "Unique" }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied).toEqual([
      { condition: "Rarity", operator: "==", value: "Unique", level: "item", overrides: ["category"] },
    ]); // missing operator defaults to "=="
  });

  it("lists both earlier levels, oldest first, when three levels set the same condition", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "Rarity", value: "Normal" }] },
      { level: "subcategory", conditions: [{ condition: "Rarity", value: "Magic" }] },
      { level: "item", conditions: [{ condition: "Rarity", value: "Rare" }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied[0]?.overrides).toEqual(["category", "subcategory"]); // accumulated, not replaced
  });

  it("drops a condition an item sets to null and records the value it removed and who removed it", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "Corrupted", value: false }] },
      { level: "subcategory", conditions: [{ condition: "Corrupted", value: true }] },
      { level: "item", conditions: [{ condition: "Corrupted", value: null }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied).toEqual([]);
    expect(result.removed).toEqual([{ condition: "Corrupted", value: true, level: "subcategory", removedBy: "item" }]); // overrides stripped
  });

  it("ignores a removal of a condition that no earlier level set", () => {
    const layers = [{ level: "item", conditions: [{ condition: "Corrupted", value: null }] }] as const;

    const result = composeLayers(layers);

    expect(result).toEqual({ applied: [], removed: [] }); // nothing to remove, nothing recorded
  });

  it("forgets a removal when a later level sets the condition again", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "Corrupted", value: false }] },
      { level: "subcategory", conditions: [{ condition: "Corrupted", value: null }] },
      { level: "item", conditions: [{ condition: "Corrupted", value: true }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result).toEqual({ applied: [{ condition: "Corrupted", value: true, level: "item" }], removed: [] }); // no overrides: earlier was deleted
  });

  it("keeps each condition where it was first set, even after a later level replaces it", () => {
    const layers = [
      {
        level: "category",
        conditions: [
          { condition: "Class", value: "Rings" },
          { condition: "Rarity", value: "Rare" },
        ],
      },
      { level: "item", conditions: [{ condition: "Class", value: "Amulets" }] },
    ] as const;

    const result = composeLayers(layers);

    expect(result.applied.map((c) => c.condition)).toEqual(["Class", "Rarity"]); // Map.set keeps the insertion slot
  });

  it("does not change the layers it was given", () => {
    const layers = [
      { level: "category", conditions: [{ condition: "Rarity", value: "Rare" }] },
      { level: "item", conditions: [{ condition: "Rarity", value: null }] },
    ] as const;
    const before = structuredClone(layers);

    composeLayers(layers);

    expect(layers).toEqual(before); // spreads, never writes back
  });
});
