import { describe, it, expect } from "@jest/globals";
import type { Condition } from "@poe/filter-compile/types";
import { evaluateFilter } from "@poe/filter-eval/evaluate-filter";
import { CONDITIONS, CONDITIONS_BY_LOWER, type FilterItem } from "@poe/filter-eval/filter-ast";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { itemsOf } from "./items-of.ts";
import { place } from "./place.ts";
import type { CatalogRow, CategoryRecord, Palette, PlaceOptions } from "./types.ts";
import { writeFilter, type CategoryPlan } from "./write-filter.ts";

const CHAOS = { T0: 150, T1: 50, T2: 30, T3: 10, T4: 5, T5: 1 };
const STACKS = { T0: 5000, T1: 2500, T2: 1000, T3: 500, T4: 250, T5: 100 };
const PALETTE: Palette = { primary: "#f05a23", secondary: "#ffffff", icon: "Star" };

const byName: Condition = { condition: "BaseType", operator: "==", from: "name" };

const categories: Record<string, CategoryRecord> = {
  Currency: { conditions: [{ condition: "Class", operator: "==", value: ["Stackable Currency"] }, byName] },
  bases: { conditions: [{ condition: "Rarity", operator: "==", value: ["Normal", "Magic", "Rare"] }, byName] },
  unique: { conditions: [{ condition: "Rarity", operator: "==", value: ["Unique"] }], hints: ["check", "gamble"] },
  "skill-gems": { conditions: [{ condition: "Class", operator: "==", value: ["Skill Gems"] }, byName] },
  Gold: { conditions: [byName], tiering: "stack-size" },
};

const currency = (name: string, meanPrice: number): CatalogRow => ({
  key: `currency/${name}`,
  name,
  category: "Currency",
  subcategory: null,
  baseTypes: [name],
  meanPrice,
});

const rows: readonly CatalogRow[] = [
  currency("Divine Orb", 180),
  currency("Chaos Orb", 1),
  currency("Orb of Alchemy", 0.2),
  currency("Screaming Essence of Fear", 0.98),
  {
    key: "Metadata/Items/Belts/Belt4",
    name: "Heavy Belt",
    category: "bases",
    subcategory: null,
    baseTypes: ["Heavy Belt"],
    variants: [
      { name: "ilvl 86", conditions: [{ condition: "ItemLevel", operator: ">=", value: 86 }], meanPrice: 6 },
      { name: "ilvl 85", conditions: [{ condition: "ItemLevel", operator: "==", value: 85 }], meanPrice: 2 },
    ],
    uniques: [
      {
        category: "unique",
        subcategory: null,
        listings: [
          { name: "Siegebreaker", meanPrice: 1, corrupted: false },
          { name: "Mageblood", meanPrice: 80000, corrupted: false },
          { name: "Mageblood", meanPrice: 90000, corrupted: true },
        ],
      },
    ],
  },
  {
    key: "authored/heavy-belt",
    name: "Heavy Belt Uniques",
    category: "unique",
    subcategory: "regular",
    baseTypes: ["Heavy Belt"],
    conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }],
    variants: [
      { name: "normal", conditions: [{ condition: "Corrupted", value: false }] },
      { name: "corrupted", conditions: [{ condition: "Corrupted", value: true }] },
    ],
  },
  {
    key: "Metadata/Items/Gems/SkillGemAbsolution",
    name: "Absolution",
    category: "skill-gems",
    subcategory: null,
    baseTypes: ["Absolution"],
    variants: [
      {
        name: "20/20",
        conditions: [
          { condition: "GemLevel", operator: "==", value: 20 },
          { condition: "Quality", operator: "==", value: 20 },
          { condition: "Corrupted", value: false },
        ],
        meanPrice: 12,
      },
      {
        name: "21/20",
        conditions: [
          { condition: "GemLevel", operator: "==", value: 21 },
          { condition: "Quality", operator: "==", value: 20 },
          { condition: "Corrupted", value: true },
        ],
        meanPrice: 60,
      },
    ],
  },
  { key: "Metadata/Items/Currency/GoldCoin", name: "Gold", category: "Gold", subcategory: null, baseTypes: ["Gold"] },
];

function plans(): readonly CategoryPlan[] {
  const items = itemsOf(rows);

  return Object.entries(categories).map(([key, record]) => {
    const options: PlaceOptions = {
      floors: record.tiering === "stack-size" ? STACKS : CHAOS,
      disabled: [],
      hints: record.hints ?? [],
      wanted: key === "Currency" ? ["Screaming Essence of Fear"] : [],
      ...(record.tiering === undefined ? {} : { tiering: record.tiering }),
    };
    return { palette: PALETTE, placed: place(items.filter((item) => item.category === key), options) };
  });
}

function numeric(conditions: readonly Condition[]): number {
  const at = (condition: Condition) => {
    const value = Number(condition.value);
    if (condition.operator === ">") return value + 1;
    if (condition.operator === "<") return value - 1;
    return value;
  };
  const lower = conditions.filter((one) => one.operator !== "<" && one.operator !== "<=");

  return lower.length === 0 ? at(conditions[0] as Condition) : Math.max(...lower.map(at));
}

/** An item that every condition matches. */
function exampleOf(conditions: readonly Condition[]): FilterItem {
  const names = [...new Set(conditions.map((one) => one.condition))];

  return Object.fromEntries(
    names.map((raw) => {
      const name = CONDITIONS_BY_LOWER.get(raw.toLowerCase()) as keyof typeof CONDITIONS;
      const mine = conditions.filter((one) => one.condition === raw);
      const value = mine[0]?.value;
      const kind = CONDITIONS[name].kind;

      if (kind === "numeric") return [name, numeric(mine)];
      if (kind === "boolean") return [name, value];
      if (kind === "enums") return [name, [Array.isArray(value) ? value[0] : value]];
      return [name, Array.isArray(value) ? value[0] : value];
    }),
  ) as FilterItem;
}

describe("writeFilter", () => {
  const written = writeFilter({ rows, categories, plans: plans() });

  it("writes a filter the parser reads back, one block per winning placement", () => {
    expect(written.skipped).toEqual([]);
    expect(parseFilter(written.text)).toHaveLength(written.blocks.length);
  });

  it("places every item in the block the model placed it in", () => {
    const blocks = parseFilter(written.text);

    for (const block of written.blocks) {
      const result = evaluateFilter(blocks, exampleOf(block.conditions));

      expect({ item: block.item.name, freehand: result.matched[0]?.freehand, verb: result.notes.verb }).toEqual({
        item: block.item.name,
        freehand: block.freehand,
        verb: block.verb,
      });
    }
  });

  it("orders Want to see, then T0 to T5, then Hidden", () => {
    const order = written.blocks.map((one) => one.bucket);
    const rank = ["Want to see", "T0", "T1", "T2", "T3", "T4", "T5", "Hidden"];

    expect(order).toEqual([...order].sort((a, b) => rank.indexOf(a) - rank.indexOf(b)));
    expect(order[0]).toBe("Want to see");
  });

  it("writes Hidden as Hide, and everything else as Show", () => {
    const keywords = parseFilter(written.text).map((one) => one.keyword);

    written.blocks.forEach((block, at) => expect(keywords[at]).toBe(block.bucket === "Hidden" ? "Hide" : "Show"));
  });

  it("writes Heavy Belt Uniques as a T0 check with a blue border", () => {
    const text = written.text.split("\n\n").find((one) => one.includes("authored/heavy-belt normal"));

    expect(text).toContain("#@ tier=T0 verb=check");
    expect(text).toContain("SetBorderColor 60 140 255 255");
  });

  it("writes a Divine Orb as a T0 take on white, with an icon and a beam", () => {
    const text = written.text.split("\n\n").find((one) => one.includes('"Divine Orb"'));

    expect(text).toContain("SetFontSize 45");
    expect(text).toContain("SetBackgroundColor 255 255 255 255");
    expect(text).toContain("MinimapIcon 0 Orange Star");
    expect(text).toContain("PlayEffect Orange");
  });

  it("gives Gold a StackSize range per tier", () => {
    const gold = written.blocks.filter((one) => one.item.name === "Gold").map((one) => [one.bucket, one.conditions.slice(1)]);

    expect(gold).toContainEqual(["T1", [
      { condition: "StackSize", operator: ">=", value: 2500 },
      { condition: "StackSize", operator: "<", value: 5000 },
    ]]);
    expect(gold).toContainEqual(["Hidden", [{ condition: "StackSize", operator: "<", value: 100 }]]);
  });

  it("skips a placement whose row has no conditions, with its reason", () => {
    const bare: CatalogRow = { key: "bare", name: "Bare", category: "misc", subcategory: null, baseTypes: ["Bare"], meanPrice: 200 };
    const placed = place(itemsOf([bare]), { floors: CHAOS, disabled: [], hints: [], wanted: [] });

    expect(writeFilter({ rows: [bare], categories: {}, plans: [{ palette: PALETTE, placed }] }).skipped).toEqual([
      { item: "Bare", problem: "has no conditions yet" },
    ]);
  });
});
