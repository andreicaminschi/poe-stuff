import { describe, expect, it } from "@jest/globals";
import { buildEvalCases, type EvalRow } from "./build-eval-cases.ts";

const ringSamples = {
  conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }],
  samples: [
    {
      Class: { values: ["Rings"] },
      BaseType: { from: "baseTypes" as const },
      Rarity: { values: ["Normal", "Magic", "Rare"] },
    },
  ],
  rejects: [{ Class: { values: ["Amulets"] } }],
};

const categories = {
  rings: { conditions: [{ condition: "Class", operator: "==", value: "Rings" }] },
  "rings/any": ringSamples,
  "rings/other": ringSamples,
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
  it("makes one case per distinct item", () => {
    const { cases } = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases).toHaveLength(3);
    expect(cases[0]?.item).toMatchObject({ Class: "Rings", BaseType: "Ruby Ring", Rarity: "Normal" });
  });

  it("answers each case with the market entry of the row whose block takes it", () => {
    const { cases: [first] } = buildEvalCases([row("Ring")], categories);

    expect(first?.expected).toEqual([{ source: "poeWatch:items", id: 1, name: "Ring" }]);
  });

  it("matches a row whose key has a space", () => {
    const { cases: [first] } = buildEvalCases([row("Ruby Ring")], categories);

    expect(first?.expected).toEqual([{ source: "poeWatch:items", id: 1, name: "Ruby Ring" }]);
  });

  it("leaves out reject samples", () => {
    const { cases } = buildEvalCases([row("Ruby Ring")], categories);

    expect(cases.every((one) => one.item.Class === "Rings")).toBe(true);
  });

  it("reports an item two paths both build, and keeps one case for it", () => {
    const { cases, overlaps } = buildEvalCases([row("Ruby Ring"), row("Ruby Ring 2", "other")], categories);
    const sameBase = buildEvalCases(
      [row("Ruby Ring"), { ...row("Ruby Ring", "other"), key: "Ruby Ring Other" }],
      categories,
    );

    expect(overlaps).toEqual([]);
    expect(cases).toHaveLength(6);
    expect(sameBase.cases).toHaveLength(3);
    expect(sameBase.overlaps).toHaveLength(3);
    expect(sameBase.overlaps[0]?.paths).toEqual(["rings/any", "rings/other"]);
  });

  it("reports an item two rows on one path both build, naming both rows", () => {
    const { cases, overlaps } = buildEvalCases(
      [row("Ruby Ring"), { ...row("Ruby Ring"), key: "Ruby Ring B" }],
      categories,
    );

    expect(cases).toHaveLength(3);
    expect(overlaps).toHaveLength(3);
    expect(overlaps[0]).toMatchObject({
      rows: ["Ruby Ring", "Ruby Ring B"],
      paths: ["rings/any", "rings/any"],
    });
  });

  it("makes no cases when there are no rows", () => {
    expect(buildEvalCases([], categories)).toEqual({ cases: [], overlaps: [] });
  });
});
