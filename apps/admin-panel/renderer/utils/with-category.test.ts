import { describe, it, expect } from "@jest/globals";
import { withCategory } from "./with-category.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { category } from "../test-helpers.ts";

describe("withCategory", () => {
  it("records a deletion as null rather than dropping the key", () => {
    const next = withCategory(NO_CHANGES, "gems", null);

    expect(next.categories).toEqual({ gems: null }); // null is how a delete reaches the draft
  });

  it("overwrites an earlier change to the same path", () => {
    const first = withCategory(NO_CHANGES, "gems", null);

    const next = withCategory(first, "gems", category("gems"));

    expect(next.categories).toEqual({ gems: category("gems") });
  });

  it("keeps earlier changes to other paths", () => {
    const first = withCategory(NO_CHANGES, "maps", null);

    const next = withCategory(first, "gems", category("gems"));

    expect(next.categories).toEqual({ maps: null, gems: category("gems") });
  });

  it("leaves the changes it was given untouched", () => {
    withCategory(NO_CHANGES, "gems", null);

    expect(NO_CHANGES.categories).toEqual({}); // a shared constant; writing into it would leak
  });
});
