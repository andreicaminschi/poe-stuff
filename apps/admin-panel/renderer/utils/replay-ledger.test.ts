import { describe, it, expect } from "@jest/globals";
import { replayLedger } from "./replay-ledger.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

describe("replayLedger", () => {
  it("returns the base itself when the ledger is empty", () => {
    const base = draftOf([ggg("a")]);

    const next = replayLedger(base, []);

    expect(next).toBe(base); // reduce with no entries hands back the seed
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

    expect(next.categories["gems"]?.name).toBe("Gems"); // reversed order would leave it deleted
  });

  it("reads an entry that carries only items or only categories", () => {
    const base = draftOf([ggg("a")], [category("gems")]);

    const next = replayLedger(base, [
      { seq: 1, at: "t", action: "save-items", changes: { items: { b: ggg("b") } } },
      { seq: 2, at: "t", action: "delete-category", changes: { categories: { gems: null } } },
    ]);

    expect({ items: Object.keys(next.items), categories: next.categories }).toEqual({
      items: ["a", "b"],
      categories: {},
    }); // a missing side is read as no changes, not a crash
  });

  it("leaves the base draft as it was", () => {
    const base = draftOf([ggg("a")]);

    replayLedger(base, [{ seq: 1, at: "t", action: "save-items", changes: { items: { b: ggg("b") } } }]);

    expect(Object.keys(base.items)).toEqual(["a"]); // replaying must not write into the base
  });
});
