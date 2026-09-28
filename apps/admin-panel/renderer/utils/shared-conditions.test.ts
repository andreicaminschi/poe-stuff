import { describe, it, expect } from "@jest/globals";
import { sharedConditions } from "./shared-conditions.ts";
import { ggg } from "../test-helpers.ts";

describe("sharedConditions", () => {
  const rare = { condition: "Rarity", value: "Rare" };
  const ilvl = { condition: "ItemLevel", operator: ">=", value: 75 };

  it("has nothing in common across no items", () => {
    const shared = sharedConditions([]);

    expect(shared).toEqual([]);
  });

  it("returns all of one item's conditions", () => {
    const shared = sharedConditions([ggg("a", { conditions: [rare, ilvl] })]);

    expect(shared).toEqual([rare, ilvl]);
  });

  it("keeps only what every item has, in the first item's order", () => {
    const items = [
      ggg("a", { conditions: [ilvl, rare] }),
      ggg("b", { conditions: [rare, ilvl] }),
      ggg("c", { conditions: [rare] }),
    ];

    const shared = sharedConditions(items);

    expect(shared).toEqual([rare]);
  });

  it("has nothing in common once one item has no conditions", () => {
    const items = [ggg("a", { conditions: [rare] }), ggg("b")];

    const shared = sharedConditions(items);

    expect(shared).toEqual([]);
  });

  it("matches conditions written differently but meaning the same", () => {
    const items = [
      ggg("a", { conditions: [rare] }),
      ggg("b", { conditions: [{ condition: "Rarity", operator: "==", value: "Rare" }] }),
    ];

    const shared = sharedConditions(items);

    expect(shared).toEqual([rare]); // compared by meaning, returned as the first item wrote it
  });

  it("keeps a condition the first item lists twice twice", () => {
    const items = [ggg("a", { conditions: [rare, rare] }), ggg("b", { conditions: [rare] })];

    const shared = sharedConditions(items);

    expect(shared).toEqual([rare, rare]); // no deduplication
  });
});
