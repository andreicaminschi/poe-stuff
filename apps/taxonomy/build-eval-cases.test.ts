import { describe, expect, it } from "@jest/globals";
import { buildEvalCases, type EvalRow } from "./build-eval-cases.ts";

const sampleSet = (rarities: string[]) => ({
  conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }],
  samples: [
    {
      Class: { values: ["Rings"] },
      BaseType: { from: "baseTypes" as const },
      Rarity: { values: rarities },
    },
  ],
  rejects: [{ Class: { values: ["Amulets"] } }],
});
const ringSamples = sampleSet(["Normal", "Magic", "Rare"]);

const categories = {
  rings: { conditions: [{ condition: "Class", operator: "==", value: "Rings" }] },
  "rings/any": ringSamples,
  "rings/other": ringSamples,
  "rings/unique": sampleSet(["Unique"]),
};

const row = (key: string, subcategory = "any"): EvalRow => ({
  key,
  name: key,
  category: "rings",
  subcategory,
  baseTypes: [key],
  poeWatch: { source: "poeWatch:items", id: 1, name: key },
});

describe("buildEvalCases", () => {
  it("makes one case for each rarity a ring's sample set lists", () => {
    const { cases } = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases.map((one) => one.item.Rarity)).toEqual(["Normal", "Magic", "Rare"]);
  }); // three rarities, one base: three distinct items

  it("expects the market entry of the row whose compiled block takes the item", () => {
    const { cases: [first] } = buildEvalCases([row("Ruby Ring")], categories);

    expect(first?.expected).toEqual([{ source: "poeWatch:items", id: 1, name: "Ruby Ring" }]);
  }); // the key holds a space, so the note split must find the longest key

  it("expects a unique ring's listings off its base rather than the filter's block", () => {
    const uniqueRow: EvalRow = {
      ...row("Ruby Ring", "unique"),
      poeWatch: undefined,
      uniques: [{ subcategory: null, listings: [{ corrupted: false, poeWatch: { source: "poeWatch:items", id: 9, name: "Ming's Heart" } }] }],
    };

    const { cases } = buildEvalCases([uniqueRow], categories);

    expect(cases).toEqual([
      { item: expect.objectContaining({ Rarity: "Unique" }), expected: [{ source: "poeWatch:items", id: 9, name: "Ming's Heart" }] },
    ]);
  }); // Rarity Unique routes to the unique finder

  it("leaves out the amulet samples a sample set only builds to be rejected", () => {
    const { cases } = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases.every((one) => one.item.Class === "Rings")).toBe(true);
  }); // rejects are for the validator, not the classifier

  it("reports no overlap when two rows on two paths build different bases", () => {
    const { cases, overlaps } = buildEvalCases([row("Ruby Ring"), row("Iron Ring", "other")], categories);

    expect(cases).toHaveLength(6);
    expect(overlaps).toEqual([]);
  });

  it("keeps one case and reports an overlap when rows on two paths build the same ring", () => {
    const { cases, overlaps } = buildEvalCases(
      [row("Ruby Ring"), { ...row("Ruby Ring", "other"), key: "Ruby Ring Other" }],
      categories,
    );

    expect(cases).toHaveLength(3);
    expect(overlaps).toHaveLength(3);
    expect(overlaps[0]?.paths).toEqual(["rings/any", "rings/other"]);
  }); // the first row to build an item keeps it

  it("names both rows, first claimant first, when two rows on one path build the same ring", () => {
    const { overlaps } = buildEvalCases(
      [row("Ruby Ring"), { ...row("Ruby Ring"), key: "Ruby Ring B" }],
      categories,
    );

    expect(overlaps[0]).toMatchObject({
      rows: ["Ruby Ring", "Ruby Ring B"],
      paths: ["rings/any", "rings/any"],
    });
  });

  it("makes no cases and no overlaps when there are no rows", () => {
    const result = buildEvalCases([], categories);

    expect(result).toEqual({ cases: [], overlaps: [] });
  });
});
