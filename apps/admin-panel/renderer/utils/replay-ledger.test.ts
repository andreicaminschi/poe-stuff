import { describe, it, expect } from "@jest/globals";
import { replayLedger } from "./replay-ledger.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

describe("replayLedger", () => {
  it("returns the base itself when the ledger is empty", () => {
    const base = draftOf([ggg("a")]);

    expect(replayLedger(base, [])).toBe(base);
  });

  it("applies entries in order, so a later entry wins", () => {
    const base = draftOf([], [category("gems")]);

    const next = replayLedger(base, [
      { seq: 1, at: "t", action: "delete-category", changes: { categories: { gems: null } } },
      {
        seq: 2,
        at: "t",
        action: "save-category",
        changes: { categories: { gems: category("gems", { name: "Gems" }) } },
      },
    ]);

    expect(next.categories["gems"]?.name).toBe("Gems");
  });

  it("reads an entry that carries only items or only categories", () => {
    const base = draftOf([ggg("a")], [category("gems")]);

    const next = replayLedger(base, [
      { seq: 1, at: "t", action: "save-items", changes: { items: { b: ggg("b") } } },
      { seq: 2, at: "t", action: "delete-category", changes: { categories: { gems: null } } },
    ]);

    expect(Object.keys(next.items)).toEqual(["a", "b"]);
    expect(next.categories).toEqual({});
  });
});
