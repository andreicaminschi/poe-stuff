import { describe, it, expect } from "@jest/globals";
import { toDraftChanges } from "./to-draft-changes.ts";
import { ggg } from "../test-helpers.ts";

describe("toDraftChanges", () => {
  it("drops both sides when nothing changed", () => {
    const changes = toDraftChanges({ items: {}, categories: {} });

    expect(changes).toEqual({}); // no empty objects sent to the ledger
  });

  it("keeps only the side that has changes", () => {
    const changes = toDraftChanges({ items: { a: ggg("a") }, categories: {} });

    expect(changes).toEqual({ items: { a: ggg("a") } });
  });

  it("keeps a category deletion as a change", () => {
    const changes = toDraftChanges({ items: {}, categories: { gems: null } });

    expect(changes).toEqual({ categories: { gems: null } }); // null value still counts as a key
  });
});
