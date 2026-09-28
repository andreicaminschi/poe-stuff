import { describe, it, expect } from "@jest/globals";
import { sharedConditions } from "./shared-conditions.ts";
import { ggg } from "../test-helpers.ts";

describe("sharedConditions", () => {
  const rare = { condition: "Rarity", value: "Rare" };
  const ilvl = { condition: "ItemLevel", operator: ">=", value: 75 };

  it("has nothing in common across no items", () => {
    expect(sharedConditions([])).toEqual([]);
  });

  it("returns all of one item's conditions", () => {
    expect(sharedConditions([ggg("a", { conditions: [rare, ilvl] })])).toEqual([rare, ilvl]);
  });

  it("keeps only what every item has, in the first item's order", () => {
    const items = [
      ggg("a", { conditions: [ilvl, rare] }),
      ggg("b", { conditions: [rare, ilvl] }),
      ggg("c", { conditions: [rare] }),
    ];

    expect(sharedConditions(items)).toEqual([rare]);
  });

  it("keeps a condition the first item lists twice twice", () => {
    const items = [ggg("a", { conditions: [rare, rare] }), ggg("b", { conditions: [rare] })];

    expect(sharedConditions(items)).toEqual([rare, rare]);
  });
});
