import { describe, it, expect } from "@jest/globals";
import { changeCount } from "./change-count.ts";
import { NO_CHANGES } from "./no-changes.ts";
import { category, ggg } from "../test-helpers.ts";

describe("changeCount", () => {
  it("counts nothing for no changes", () => {
    expect(changeCount(NO_CHANGES)).toBe(0);
  });

  it("counts edited items and categories together, a deletion included", () => {
    expect(changeCount({ items: { a: ggg("a") }, categories: { gems: category("gems"), maps: null } })).toBe(3);
  });
});
