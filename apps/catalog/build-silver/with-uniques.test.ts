import { describe, expect, it } from "@jest/globals";
import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { Item } from "../item.ts";
import { withUniques } from "./with-uniques.ts";

const base = (name: string): Item => ({ key: name, name, category: "c", subcategory: null, baseTypes: [name] });

const trade = (...uniques: [string, string][]): GGGItemGroup[] =>
  [
    {
      id: "g",
      label: "G",
      items: [
        { kind: "base", baseType: "Leather Belt" },
        ...uniques.map(([name, baseType]) => ({ kind: "unique", name, baseType, displayText: name })),
      ],
    },
  ] as unknown as GGGItemGroup[];

const unique = (id: number, name: string, mean: number, daily: number, frame = 3): ItemData =>
  ({ id, name, mean, daily, frame, lowConfidence: false, icon: "" }) as unknown as ItemData;

const outcomes = (itemId: number, ...found: [string, number, number][]): ItemCorruptions =>
  ({
    item_id: itemId,
    corruptions: found.map(([name, mean, daily]) => ({ name, mean, daily, lowConfidence: false })),
  }) as unknown as ItemCorruptions;

describe("withUniques", () => {
  it("hangs Headhunter off the Leather Belt because the trade list says it rolls there", () => {
    const [row] = withUniques([base("Leather Belt")], trade(["Headhunter", "Leather Belt"]), [unique(1, "Headhunter", 5000, 3)], []);

    expect(row?.uniques).toEqual([
      {
        category: "unique",
        subcategory: null,
        listings: [
          {
            name: "Headhunter",
            meanPrice: 5000,
            corrupted: false,
            lowConfidence: false,
            poeWatch: { source: "poeWatch:items", id: 1, name: "Headhunter" },
          },
        ],
      },
    ]);
  }); // the base comes from GGG, the price from PoeWatch

  it("returns the very same row for a base no unique rolls on", () => {
    const original = base("Rustic Sash");

    const [row] = withUniques([original], trade(["Headhunter", "Leather Belt"]), [unique(1, "Headhunter", 1, 1)], []);

    expect(row).toBe(original);
  }); // no empty `uniques` key is added

  it("ignores a listing that is not in the unique frame", () => {
    const [row] = withUniques([base("Leather Belt")], trade(["Headhunter", "Leather Belt"]), [unique(1, "Headhunter", 1, 1, 2)], []);

    expect(row?.uniques).toBeUndefined();
  }); // frame 3 is PoeWatch's unique frame

  it("drops a listing whose unique the trade list does not name", () => {
    const [row] = withUniques([base("Leather Belt")], trade(), [unique(1, "Headhunter", 1, 1)], []);

    expect(row?.uniques).toBeUndefined();
  }); // no base means nowhere to hang it

  it("files foulborn forms in their own group after the plain one, each sorted by name", () => {
    const listings = [
      unique(1, "Foulborn Headhunter (Culling)", 9, 1),
      unique(2, "Headhunter", 5, 1),
      unique(3, "Foulborn Headhunter (Aberrant)", 7, 1),
    ];

    const [row] = withUniques([base("Leather Belt")], trade(["Headhunter", "Leather Belt"]), listings, []);

    expect(row?.uniques?.map((group) => [group.subcategory, group.listings.map((one) => one.name)])).toEqual([
      [null, ["Headhunter"]],
      ["foulborn", ["Foulborn Headhunter (Aberrant)", "Foulborn Headhunter (Culling)"]],
    ]);
  }); // the prefix and the tag are both stripped to find the unique

  it("keeps one entry per listed name, the most listed and, between two with eight each, the dearer", () => {
    const listings = [unique(1, "Cloak", 10, 5), unique(2, "Cloak", 20, 8), unique(3, "Cloak", 30, 8)];

    const [row] = withUniques([base("Leather Belt")], trade(["Cloak", "Leather Belt"]), listings, []);

    expect(row?.uniques?.[0]?.listings.map((one) => one.poeWatch.id)).toEqual([3]);
  }); // PoeWatch lists a name once per link count

  it("adds each corruption outcome once, read off the listing that carries it most", () => {
    const listings = [unique(1, "Cloak", 10, 5), unique(2, "Cloak", 20, 1)];
    const corruptions = [outcomes(1, ["Imp", 50, 1]), outcomes(2, ["Imp", 60, 4], ["Zap", 3, 1])];

    const [row] = withUniques([base("Leather Belt")], trade(["Cloak", "Leather Belt"]), listings, corruptions);

    expect(row?.uniques?.[0]?.listings.map((one) => [one.name, one.meanPrice, one.corrupted, one.poeWatch])).toEqual([
      ["Cloak", 10, false, { source: "poeWatch:items", id: 1, name: "Cloak" }],
      ["Cloak (Imp)", 60, true, { source: "poeWatch:items", id: 2, name: "Imp" }],
      ["Cloak (Zap)", 3, true, { source: "poeWatch:items", id: 2, name: "Zap" }],
    ]);
  }); // outcomes come from every listing, not only the chosen one

  it("hangs a unique on every base it rolls on and on every row that shares a base name", () => {
    const rows = [base("Leather Belt"), { ...base("Leather Belt"), key: "other" }, base("Chain Belt")];

    const result = withUniques(rows, trade(["Belt", "Leather Belt"], ["Belt", "Chain Belt"], ["Belt", "Chain Belt"]), [unique(1, "Belt", 1, 1)], []);

    expect(result.map((row) => row.uniques?.[0]?.listings.length)).toEqual([1, 1, 1]);
  }); // a base listed twice in the trade list is not hung twice

  it("strips every trailing parenthesised form when finding the unique, but keeps them in the listed name", () => {
    const [row] = withUniques([base("Leather Belt")], trade(["A", "Leather Belt"]), [unique(1, "A (B) (C)", 1, 1)], []);

    expect(row?.uniques?.[0]?.listings[0]?.name).toBe("A (B) (C)");
  }); // `( \([^)]*\))+$` removes both groups
});
