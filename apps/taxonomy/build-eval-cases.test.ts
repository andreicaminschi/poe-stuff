import { describe, expect, it } from "@jest/globals";
import { buildEvalCases, type EvalRow } from "./build-eval-cases.ts";

const categories = {
  rings: { conditions: [{ condition: "Class", operator: "==", value: "Rings" }] },
  "rings/any": {
    conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }],
    samples: [
      {
        Class: { values: ["Rings"] },
        BaseType: { from: "baseTypes" as const },
        Rarity: { values: ["Normal", "Magic", "Rare"] },
      },
    ],
    rejects: [{ Class: { values: ["Amulets"] } }],
  },
};

const row = (key: string): EvalRow => ({
  key,
  name: key,
  category: "rings",
  subcategory: "any",
  baseTypes: [key],
  poeWatch: { source: "poeWatch:items", id: 1, name: key },
});

describe("buildEvalCases", () => {
  it("makes one case per distinct item", () => {
    const cases = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases).toHaveLength(3);
    expect(cases[0]?.item).toMatchObject({ Class: "Rings", BaseType: "Ruby Ring", Rarity: "Normal" });
  });

  it("answers each case with the PoeWatch entry of the row whose block takes it", () => {
    const [first] = buildEvalCases([row("Ring")], categories);

    expect(first?.matches).toEqual([{ source: "poeWatch:items", id: 1, name: "Ring" }]);
  });

  it("matches a row whose key has a space", () => {
    const [first] = buildEvalCases([row("Ruby Ring")], categories);

    expect(first?.matches).toEqual([{ source: "poeWatch:items", id: 1, name: "Ruby Ring" }]);
  });

  it("leaves out reject samples", () => {
    const cases = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases.every((one) => one.item.Class === "Rings")).toBe(true);
  });

  it("makes no cases when there are no rows", () => {
    expect(buildEvalCases([], categories)).toEqual([]);
  });
});
