import { describe, it, expect } from "@jest/globals";
import type { LedgerEntry } from "../../api/ledger/types.ts";
import type { Category, Draft, GggItem } from "../../api/taxonomy/types.ts";
import { replayLedger } from "./replay-ledger.ts";

const item = (name: string): GggItem => ({
  source: "ggg",
  key: "a",
  name,
  classification: { category: "currency", subcategory: null },
  conditions: [],
  variants: [],
});

const category = (path: string): Category => ({ path, tiering: "chaos", conditions: [] });

const base: Draft = { id: "3.29.2", items: { a: item("a") }, categories: { map: category("map") } };

const entry = (seq: number, changes: LedgerEntry["changes"]): LedgerEntry => ({
  seq,
  at: "2026-09-10T00:00:00.000Z",
  action: "save-items",
  changes,
});

describe("replayLedger", () => {
  it("gives the base back for an empty ledger", () => {
    expect(replayLedger(base, [])).toBe(base);
  });

  it("applies entries in order, the later one winning", () => {
    const draft = replayLedger(base, [entry(1, { items: { a: item("b") } }), entry(2, { items: { a: item("c") } })]);

    expect(draft.items["a"]?.name).toBe("c");
  });

  it("adds a category and deletes one written as null", () => {
    const draft = replayLedger(base, [entry(1, { categories: { gem: category("gem"), map: null } })]);

    expect(Object.keys(draft.categories)).toEqual(["gem"]);
  });

  it("leaves the base untouched", () => {
    replayLedger(base, [entry(1, { items: { a: item("b") } })]);

    expect(base.items["a"]?.name).toBe("a");
  });
});
