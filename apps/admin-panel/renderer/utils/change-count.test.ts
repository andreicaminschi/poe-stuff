import { describe, it, expect } from "@jest/globals";
import { changeCount } from "./change-count.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { category, ggg } from "../test-helpers.ts";

describe("changeCount", () => {
  it("counts nothing for no changes", () => { // zero is what lets the panel skip the discard question
    expect(changeCount(NO_CHANGES)).toBe(0);
  });

  it("counts one edited item and two category changes as three, a deletion included", () => { // a null deletion is still a change
    expect(changeCount({ items: { a: ggg("a") }, categories: { gems: category("gems"), maps: null } })).toBe(3);
  });
});
