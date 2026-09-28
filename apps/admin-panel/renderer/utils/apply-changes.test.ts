import { describe, it, expect } from "@jest/globals";
import { applyChanges } from "./apply-changes.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

describe("applyChanges", () => {
  it("replaces an edited item and keeps the rest", () => { // items are a plain spread, edits win
    const draft = draftOf([ggg("a"), ggg("b")]);
    const edited = ggg("a", { excluded: true });

    const next = applyChanges(draft, { items: { a: edited }, categories: {} });

    expect(next.items).toEqual({ a: edited, b: draft.items["b"] });
  });

  it("deletes a category whose change is null", () => { // null is the deletion marker, only for categories
    const draft = draftOf([], [category("gems"), category("maps")]);

    const next = applyChanges(draft, { items: {}, categories: { gems: null } });

    expect(Object.keys(next.categories)).toEqual(["maps"]);
  });

  it("adds a new category and ignores a deletion of one that never existed", () => { // deleting a missing key must not leave a null behind
    const draft = draftOf();

    const next = applyChanges(draft, { items: {}, categories: { gems: category("gems"), ghost: null } });

    expect(Object.keys(next.categories)).toEqual(["gems"]);
  });

  it("leaves the draft it was given untouched", () => { // overlay deletes from a copy, never the input
    const draft = draftOf([ggg("a")], [category("gems")]);

    applyChanges(draft, { items: { b: ggg("b") }, categories: { gems: null } });

    expect(Object.keys(draft.items)).toEqual(["a"]);
    expect(Object.keys(draft.categories)).toEqual(["gems"]);
  });
});
