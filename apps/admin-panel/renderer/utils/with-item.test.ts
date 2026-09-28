import { describe, it, expect } from "@jest/globals";
import { withItem } from "./with-item.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { ggg } from "../test-helpers.ts";

describe("withItem", () => {
  it("files the item under its own key, not its name", () => {
    const next = withItem(NO_CHANGES, ggg("a", { key: "k1" }));

    expect(Object.keys(next.items)).toEqual(["k1"]);
  });

  it("replaces an earlier edit of the same item", () => {
    const first = withItem(NO_CHANGES, ggg("a"));

    const next = withItem(first, ggg("a", { quest: true }));

    expect(next.items).toEqual({ a: ggg("a", { quest: true }) }); // last edit wins, one entry
  });

  it("keeps earlier edits of other items", () => {
    const first = withItem(NO_CHANGES, ggg("a"));

    const next = withItem(first, ggg("b"));

    expect(Object.keys(next.items)).toEqual(["a", "b"]);
  });

  it("leaves the changes it was given untouched", () => {
    withItem(NO_CHANGES, ggg("a"));

    expect(NO_CHANGES.items).toEqual({}); // a shared constant; writing into it would leak
  });
});
