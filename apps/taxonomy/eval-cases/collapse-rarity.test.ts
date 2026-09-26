import { describe, expect, it } from "@jest/globals";
import { collapseRarity } from "./collapse-rarity.ts";

describe("collapseRarity", () => {
  it("keeps the first non-unique rarity and every unique one", () => {
    const collapsed = collapseRarity({
      "rings/any": { conditions: [], samples: [{ Rarity: { values: ["Normal", "Magic", "Rare", "Unique"] } }] },
    });

    expect(collapsed["rings/any"]?.samples).toEqual([{ Rarity: { values: ["Normal", "Unique"] } }]);
  });

  it("keeps only unique when no other rarity is sampled", () => {
    const collapsed = collapseRarity({ u: { conditions: [], samples: [{ Rarity: { values: ["Unique"] } }] } });

    expect(collapsed.u?.samples).toEqual([{ Rarity: { values: ["Unique"] } }]);
  });

  it("leaves a rarity read from the row alone", () => {
    const set = { Rarity: { from: "conditions" as const } };

    expect(collapseRarity({ a: { conditions: [], samples: [set] } }).a?.samples).toEqual([set]);
  });

  it("leaves sets without a rarity, other properties, and categories without samples alone", () => {
    const categories = {
      a: { conditions: [], samples: [{ ItemLevel: { values: [1, 84] } }] },
      b: { conditions: [] },
    };

    expect(collapseRarity(categories)).toEqual(categories);
  });

  it("does not collapse rejects", () => {
    const rejects = [{ Rarity: { values: ["Normal", "Magic"] } }];

    expect(collapseRarity({ a: { conditions: [], rejects } }).a?.rejects).toEqual(rejects);
  });
});
