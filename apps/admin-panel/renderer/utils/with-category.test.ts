import { describe, it, expect } from "@jest/globals";
import { withCategory } from "./with-category.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { category } from "../test-helpers.ts";

describe("withCategory", () => {
  it("records a deletion as null rather than dropping the key", () => {
    expect(withCategory(NO_CHANGES, "gems", null).categories).toEqual({ gems: null });
  });

  it("overwrites an earlier change to the same path", () => {
    const first = withCategory(NO_CHANGES, "gems", null);

    const next = withCategory(first, "gems", category("gems"));

    expect(next.categories["gems"]).toEqual(category("gems"));
  });

  it("leaves the changes it was given untouched", () => {
    withCategory(NO_CHANGES, "gems", null);

    expect(NO_CHANGES.categories).toEqual({});
  });
});
