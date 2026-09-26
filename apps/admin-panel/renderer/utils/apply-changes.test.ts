import { describe, it, expect } from "@jest/globals";
import { applyChanges } from "./apply-changes.ts";
import { category, draftOf, ggg } from "../test-helpers.ts";

describe("applyChanges", () => {
  it("replaces an edited item and keeps the rest", () => {
    const draft = draftOf([ggg("a"), ggg("b")]);
    const edited = ggg("a", { excluded: true });

    const next = applyChanges(draft, { items: { a: edited }, categories: {} });

    expect(next.items).toEqual({ a: edited, b: draft.items["b"] });
  });

  it("deletes a category whose change is null", () => {
    const draft = draftOf([], [category("gems"), category("maps")]);

    const next = applyChanges(draft, { items: {}, categories: { gems: null } });

    expect(Object.keys(next.categories)).toEqual(["maps"]);
  });

  it("adds a new category and ignores a null for one that never existed", () => {
    const draft = draftOf();

    const next = applyChanges(draft, { items: {}, categories: { gems: category("gems"), ghost: null } });

    expect(Object.keys(next.categories)).toEqual(["gems"]);
  });

  it("leaves the draft it was given untouched", () => {
    const draft = draftOf([ggg("a")], [category("gems")]);

    applyChanges(draft, { items: { b: ggg("b") }, categories: { gems: null } });

    expect(Object.keys(draft.items)).toEqual(["a"]);
    expect(Object.keys(draft.categories)).toEqual(["gems"]);
  });
});
