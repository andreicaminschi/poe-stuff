import { describe, it, expect } from "@jest/globals";
import { withItem } from "./with-item.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { ggg } from "../test-helpers.ts";

describe("withItem", () => {
  it("files the item under its own key", () => {
    expect(Object.keys(withItem(NO_CHANGES, ggg("a", { key: "k1" })).items)).toEqual(["k1"]);
  });

  it("replaces an earlier edit of the same item", () => {
    const first = withItem(NO_CHANGES, ggg("a"));

    const next = withItem(first, ggg("a", { quest: true }));

    expect(next.items["a"]?.quest).toBe(true);
  });

  it("leaves the changes it was given untouched", () => {
    withItem(NO_CHANGES, ggg("a"));

    expect(NO_CHANGES.items).toEqual({});
  });
});
