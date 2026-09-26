import { describe, it, expect } from "@jest/globals";
import { writeFilter, type CategoryPlan } from "./write-filter.ts";
import type { BucketName, CatalogRow, CategoryRecord, Item, Palette, Placement, Verb } from "./types.ts";

const palette: Palette = { primary: "#ff0000", secondary: "#0000ff", icon: "Star" };

const row = (key: string, extra: Partial<CatalogRow> = {}): CatalogRow => ({
  key,
  name: key,
  category: "currency",
  subcategory: null,
  baseTypes: [key],
  conditions: [{ condition: "BaseType", operator: "==", value: [key] }],
  ...extra,
});

const categories: Record<string, CategoryRecord> = { currency: { conditions: [{ condition: "Class", operator: "==", value: ["Stackable Currency"] }] } };

const item = (key: string, variant?: string): Item => ({
  name: variant === undefined ? key : `${key} (${variant})`,
  key,
  ...(variant === undefined ? {} : { variant }),
  category: "currency",
  prices: {},
});

const at = (key: string, bucket: BucketName, verb: Verb = "take", extra: Partial<Placement> = {}): Placement => ({
  item: item(key),
  bucket,
  verb,
  reason: "",
  won: true,
  ...extra,
});

const plan = (placed: Placement[]): CategoryPlan => ({ palette, placed: { ladder: [], placed, unplaced: [] } });

describe("writeFilter", () => {
  it("writes nothing at all when no placement won", () => {
    expect(writeFilter({ rows: [], categories, plans: [plan([at("a", "T0", "take", { won: false })])] })).toEqual({
      text: "",
      blocks: [],
      skipped: [],
    });
  });

  it("writes one Show block with conditions, style lines and the note, ending in a newline", () => {
    const { text } = writeFilter({ rows: [row("Chaos Orb")], categories, plans: [plan([at("Chaos Orb", "T2")])] });

    expect(text).toBe(
      [
        "Show",
        '  Class == "Stackable Currency"',
        '  BaseType == "Chaos Orb"',
        "  SetFontSize 38",
        "  SetTextColor 0 0 255 255",
        "  SetBorderColor 0 0 255 255",
        "  SetBackgroundColor 204 0 51 255",
        "  #@ tier=T2 verb=take Chaos Orb",
        "",
      ].join("\n"),
    );
  });

  it("writes a Hidden placement as a Hide block", () => {
    const { text } = writeFilter({ rows: [row("a")], categories, plans: [plan([at("a", "Hidden")])] });

    expect(text.startsWith("Hide\n")).toBe(true);
  });

  it("orders blocks Want to see, the tiers, then Hidden, and take before check before gamble", () => {
    const rows = ["h", "t0g", "t0t", "t0c", "t5", "w"].map((key) => row(key));
    const plans = [
      plan([at("h", "Hidden"), at("t0g", "T0", "gamble"), at("t0t", "T0")]),
      plan([at("t0c", "T0", "check"), at("t5", "T5"), at("w", "Want to see")]),
    ];

    const { blocks } = writeFilter({ rows, categories, plans });

    expect(blocks.map((one) => one.item.key)).toEqual(["w", "t0t", "t0c", "t0g", "t5", "h"]);
  });

  it("writes an Unpriced placement with tier=unpriced", () => {
    const { text } = writeFilter({ rows: [row("u")], categories, plans: [plan([at("u", "Unpriced")])] });

    expect(text).toContain("tier=unpriced");
  });

  it("adds a stack range's floor and ceiling as StackSize conditions", () => {
    const placement = at("a", "T1", "take", { stack: { floor: 10, ceiling: 20 } });

    const { blocks } = writeFilter({ rows: [row("a")], categories, plans: [plan([placement])] });

    expect(blocks[0]?.conditions.slice(-2)).toEqual([
      { condition: "StackSize", operator: ">=", value: 10 },
      { condition: "StackSize", operator: "<", value: 20 },
    ]);
  });

  it("writes no StackSize floor for a stack range starting at zero", () => {
    const placement = at("a", "Hidden", "take", { stack: { floor: 0, ceiling: 5 } });

    const { blocks } = writeFilter({ rows: [row("a")], categories, plans: [plan([placement])] });

    expect(blocks[0]?.conditions.filter((one) => one.condition === "StackSize")).toEqual([{ condition: "StackSize", operator: "<", value: 5 }]);
  });

  it("names a variant's block by the row key and the variant name", () => {
    const withVariant = row("a", { variants: [{ name: "big", conditions: [{ condition: "StackSize", operator: ">=", value: 5 }] }] });
    const placement = { ...at("a", "T3"), item: item("a", "big") };

    const { blocks } = writeFilter({ rows: [withVariant], categories, plans: [plan([placement])] });

    expect(blocks[0]?.freehand).toBe("a big");
  });

  describe("skipped placements", () => {
    it("skips an item whose key no catalog row has", () => {
      const { skipped } = writeFilter({ rows: [], categories, plans: [plan([at("ghost", "T0")])] });

      expect(skipped).toEqual([{ item: "ghost", problem: "no catalog row has its key" }]);
    });

    it("skips a row that resolves to no conditions", () => {
      const bare = row("a", { conditions: [], category: "none" });

      const { skipped } = writeFilter({ rows: [bare], categories, plans: [plan([at("a", "T0")])] });

      expect(skipped).toEqual([{ item: "a", problem: "has no conditions yet" }]);
    });

    it("skips a row whose condition value holds a #", () => {
      const { skipped } = writeFilter({ rows: [row("#1")], categories, plans: [plan([at("#1", "T0")])] });

      expect(skipped).toEqual([{ item: "#1", problem: "has a # in a value, which would start a comment" }]);
    });

    it("keeps writing the other blocks after a skip", () => {
      const { blocks } = writeFilter({ rows: [row("a")], categories, plans: [plan([at("ghost", "T0"), at("a", "T1")])] });

      expect(blocks.map((one) => one.item.key)).toEqual(["a"]);
    });
  });
});
