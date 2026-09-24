import { describe, it, expect } from "@jest/globals";
import { itemsOf } from "./items-of.ts";
import type { CatalogRow } from "./types.ts";

const heavyBeltBase: CatalogRow = {
  key: "Metadata/Items/Belts/Belt4",
  name: "Heavy Belt",
  category: "bases",
  subcategory: "belt",
  baseTypes: ["Heavy Belt"],
  variants: [{ name: "ilvl 86", conditions: [], meanPrice: 6 }],
  uniques: [
    {
      category: "unique",
      subcategory: null,
      listings: [
        { name: "Siegebreaker", meanPrice: 1, corrupted: false },
        { name: "Mageblood", meanPrice: 80000, corrupted: false },
        { name: "Mageblood", meanPrice: 90000, corrupted: true },
        { name: "Mageblood", meanPrice: 5, corrupted: true },
        { name: "Headhunter", meanPrice: 999999, corrupted: false, lowConfidence: true },
      ],
    },
    {
      category: "unique",
      subcategory: "foulborn",
      listings: [{ name: "Foulborn Mageblood", meanPrice: 70000, corrupted: false }],
    },
  ],
};

const heavyBeltUniques: CatalogRow = {
  key: "authored/heavy-belt",
  name: "Heavy Belt Uniques",
  category: "unique",
  subcategory: "regular",
  baseTypes: ["Heavy Belt"],
  variants: [
    { name: "normal", conditions: [{ condition: "Corrupted", value: false }], meanPrice: 82203 },
    { name: "corrupted", conditions: [{ condition: "Corrupted", value: true }], meanPrice: 90000 },
  ],
};

const foulbornHeavyBelt: CatalogRow = {
  key: "authored/foulborn-heavy-belt",
  name: "Foulborn Heavy Belt Uniques",
  category: "foulborn",
  subcategory: null,
  baseTypes: ["Heavy Belt"],
  variants: [{ name: "normal", conditions: [{ condition: "Corrupted", value: false }], meanPrice: 70000 }],
};

const gem: CatalogRow = {
  key: "Metadata/Items/Gems/SkillGemAbsolution",
  name: "Absolution",
  category: "skill-gems",
  subcategory: "normal",
  baseTypes: ["Absolution"],
  variants: [
    { name: "20/20", conditions: [{ condition: "Corrupted", value: false }], meanPrice: 12 },
    { name: "21/20", conditions: [{ condition: "Corrupted", value: true }], meanPrice: 60 },
    { name: "1/0", conditions: [], meanPrice: 400, lowConfidence: true },
  ],
};

const byName = (rows: readonly CatalogRow[], name: string) => itemsOf(rows).find((one) => one.name === name);

describe("itemsOf", () => {
  it("reads a row without variants as one item", () => {
    const rows: CatalogRow[] = [{ key: "a", name: "Divine Orb", category: "Currency", subcategory: null, baseTypes: ["Divine Orb"], meanPrice: 180 }];

    expect(itemsOf(rows)).toEqual([{ name: "Divine Orb", key: "a", category: "Currency", prices: { take: 180 } }]);
  });

  it("reads each variant as its own item, named after the row", () => {
    const items = itemsOf([gem]);

    expect(items.map((one) => one.name)).toEqual(["Absolution (20/20)", "Absolution (21/20)", "Absolution (1/0)"]);
    expect(items[0]?.variant).toBe("20/20");
  });

  it("prices a corrupted gem as a take, like any item", () => {
    expect(byName([gem], "Absolution (20/20)")?.prices).toEqual({ take: 12 });
    expect(byName([gem], "Absolution (21/20)")?.prices).toEqual({ take: 60 });
  });

  it("never reads a lowConfidence price", () => {
    expect(byName([gem], "Absolution (1/0)")?.prices).toEqual({});
  });

  it("joins a unique row to its base's listings: take the cheapest, check the dearest", () => {
    const item = byName([heavyBeltBase, heavyBeltUniques], "Heavy Belt Uniques (normal)");

    expect(item?.prices).toEqual({ take: 1, check: 80000 });
  });

  it("prices a corrupted unique as a check only, off the corrupted listings", () => {
    const item = byName([heavyBeltBase, heavyBeltUniques], "Heavy Belt Uniques (corrupted)");

    expect(item?.prices).toEqual({ check: 90000 });
  });

  it("joins a foulborn row to the foulborn group, with no check when one form is listed", () => {
    const item = byName([heavyBeltBase, foulbornHeavyBelt], "Foulborn Heavy Belt Uniques (normal)");

    expect(item?.prices).toEqual({ take: 70000 });
  });

  it("falls back to the row's own price when no base carries the uniques", () => {
    expect(byName([heavyBeltUniques], "Heavy Belt Uniques (normal)")?.prices).toEqual({ take: 82203 });
    expect(byName([heavyBeltUniques], "Heavy Belt Uniques (corrupted)")?.prices).toEqual({ check: 90000 });
  });

  it("files a Rarity == Unique variant on a non-unique row under unique", () => {
    const jewel: CatalogRow = {
      key: "j",
      name: "Heavy Belt",
      category: "jewels",
      subcategory: "abyss-jewel",
      baseTypes: ["Heavy Belt"],
      variants: [{ name: "unique", conditions: [{ condition: "Rarity", operator: "==", value: ["Unique"] }], meanPrice: 3 }],
    };
    const item = byName([heavyBeltBase, jewel], "Heavy Belt (unique)");

    expect(item?.category).toBe("unique");
    expect(item?.prices).toEqual({ take: 1, check: 80000 });
  });

  it("gives an unpriced row no prices", () => {
    const gold: CatalogRow = { key: "g", name: "Gold", category: "Gold", subcategory: null, baseTypes: ["Gold"] };

    expect(itemsOf([gold])[0]?.prices).toEqual({});
  });
});
