import { describe, it, expect } from "@jest/globals";
import { evaluateFilter } from "@poe/filter-eval/evaluate-filter";
import { parseFilter } from "@poe/filter-eval/parse-filter";
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

const categories: Record<string, CategoryRecord> = {
  currency: { conditions: [{ condition: "Class", operator: "==", value: ["Stackable Currency"] }] },
};

const item = (key: string, variant?: string): Item => ({
  name: variant === undefined
    ? key
    : `${key} (${variant})`,
  key,
  ...(variant === undefined
    ? {}
    : { variant }),
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
  describe("blocks", () => {
    it("writes nothing at all when no placement won", () => {
      const result = writeFilter({ rows: [], categories, plans: [plan([at("a", "T0", "take", { won: false })])] });

      expect(result).toEqual({ text: "", blocks: [], skipped: [] }); // losing qualifications are never drawn
    });

    it("writes a Chaos Orb in T2 as a Show block with its conditions, style lines and note, ending in a newline", () => {
      const { text } = writeFilter({ rows: [row("Chaos Orb")], categories, plans: [plan([at("Chaos Orb", "T2")])] });

      expect(text).toBe(
        [
          "Show",
          "  Class == \"Stackable Currency\"",
          "  BaseType == \"Chaos Orb\"",
          "  SetFontSize 38",
          "  SetTextColor 0 0 255 255",
          "  SetBorderColor 0 0 255 255",
          "  SetBackgroundColor 204 0 51 255",
          "  #@ tier=T2 verb=take Chaos Orb",
          "",
        ].join("\n"),
      ); // category conditions come before the row's
    });

    it("writes a Hidden placement as a Hide block", () => {
      const { text } = writeFilter({ rows: [row("a")], categories, plans: [plan([at("a", "Hidden")])] });

      expect(text.split("\n")[0]).toBe("Hide");
    });

    it("marks an Unpriced placement's note with the unpriced tier", () => {
      const { text } = writeFilter({ rows: [row("u")], categories, plans: [plan([at("u", "Unpriced")])] });

      expect(text).toContain("#@ tier=unpriced verb=take u"); // bucket name mapped to a note value
    });

    it("names a variant's block by the row's key followed by the variant's name", () => {
      const withVariant = row("a", { variants: [{ name: "big", conditions: [{ condition: "StackSize", operator: ">=", value: 5 }] }] });
      const placement = { ...at("a", "T3"), item: item("a", "big") };

      const { blocks } = writeFilter({ rows: [withVariant], categories, plans: [plan([placement])] });

      expect(blocks[0]?.freehand).toBe("a big");
    });

    it("writes a filter in which every item lands in the block it was placed in", () => {
      const rows = [row("a"), row("b")];
      const plans = [plan([at("a", "T0"), at("b", "Hidden")])];

      const { text } = writeFilter({ rows, categories, plans });
      const blocks = parseFilter(text);
      const tierOf = (key: string) => evaluateFilter(blocks, { Class: "Stackable Currency", BaseType: key }).notes.tier;

      expect([tierOf("a"), tierOf("b")]).toEqual(["T0", "hidden"]); // read back by the independent evaluator
    });
  });

  describe("order", () => {
    it("writes Want to see first, then the tiers richest first, then Hidden, with take before check before gamble inside a tier", () => {
      const rows = ["h", "t0g", "t0t", "t0c", "t5", "w"].map((key) => row(key));
      const plans = [
        plan([at("h", "Hidden"), at("t0g", "T0", "gamble"), at("t0t", "T0")]),
        plan([at("t0c", "T0", "check"), at("t5", "T5"), at("w", "Want to see")]),
      ];

      const { blocks } = writeFilter({ rows, categories, plans });

      expect(blocks.map((one) => one.item.key)).toEqual(["w", "t0t", "t0c", "t0g", "t5", "h"]); // merged across categories, first match wins
    });
  });

  describe("stack sizes", () => {
    it("adds a stack range of 10 up to 20 as two StackSize conditions", () => {
      const placement = at("a", "T1", "take", { stack: { floor: 10, ceiling: 20 } });

      const { blocks } = writeFilter({ rows: [row("a")], categories, plans: [plan([placement])] });

      expect(blocks[0]?.conditions.slice(-2)).toEqual([
        { condition: "StackSize", operator: ">=", value: 10 },
        { condition: "StackSize", operator: "<", value: 20 },
      ]); // ceiling exclusive
    });

    it("writes no StackSize floor for a range that starts at zero", () => {
      const placement = at("a", "Hidden", "take", { stack: { floor: 0, ceiling: 5 } });

      const { blocks } = writeFilter({ rows: [row("a")], categories, plans: [plan([placement])] });

      expect(blocks[0]?.conditions.filter((one) => one.condition === "StackSize")).toEqual([
        { condition: "StackSize", operator: "<", value: 5 },
      ]); // ">= 0" would be noise
    });
  });

  describe("skipped placements", () => {
    it("skips an item whose key no catalog row has", () => {
      const { skipped } = writeFilter({ rows: [], categories, plans: [plan([at("ghost", "T0")])] });

      expect(skipped).toEqual([{ item: "ghost", problem: "no catalog row has its key" }]);
    });

    it("skips a row that resolves to no conditions", () => {
      const bare = row("a", { conditions: [], category: "none" });

      const { skipped } = writeFilter({ rows: [bare], categories, plans: [plan([at("a", "T0")])] });

      expect(skipped).toEqual([{ item: "a", problem: "has no conditions yet" }]); // would match everything
    });

    it("skips a row with a problem found while filling from the row", () => {
      const nameless = row("a", { name: "", conditions: [{ condition: "BaseType", from: "name" }] });

      const { skipped } = writeFilter({ rows: [nameless], categories, plans: [plan([at("a", "T0")])] });

      expect(skipped).toEqual([{ item: "a", problem: "reads its name, which is empty" }]);
    });

    it("skips a row whose value holds a hash", () => {
      const { skipped } = writeFilter({ rows: [row("#1")], categories, plans: [plan([at("#1", "T0")])] });

      expect(skipped).toEqual([{ item: "#1", problem: "has a # in a value, which would start a comment" }]);
    });

    it("keeps writing the other blocks after a skip", () => {
      const plans = [plan([at("ghost", "T0"), at("a", "T1")])];

      const { blocks } = writeFilter({ rows: [row("a")], categories, plans });

      expect(blocks.map((one) => one.item.key)).toEqual(["a"]); // continue, not return
    });
  });
});
