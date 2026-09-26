import { describe, it, expect } from "@jest/globals";
import { toDraftChanges } from "./to-draft-changes.ts";
import { ggg } from "../test-helpers.ts";

describe("toDraftChanges", () => {
  it("drops both keys when nothing changed", () => {
    expect(toDraftChanges({ items: {}, categories: {} })).toEqual({});
  });

  it("keeps only the side that has changes", () => {
    const changes = toDraftChanges({ items: { a: ggg("a") }, categories: {} });

    expect(Object.keys(changes)).toEqual(["items"]);
  });

  it("keeps a category deletion as a change", () => {
    expect(toDraftChanges({ items: {}, categories: { gems: null } })).toEqual({ categories: { gems: null } });
  });
});
