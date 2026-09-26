import { describe, it, expect } from "@jest/globals";
import type { FilterBlock } from "@poe/filter-eval/filter-ast";
import { ownerOf } from "./owner-of.ts";

const block = (freehand: string): FilterBlock => ({
  keyword: "Show",
  conditions: [],
  notes: [],
  freehand,
  comment: "",
  continues: false,
  line: 1,
});

describe("ownerOf", () => {
  it("reads the row key from the note's first word", () => {
    expect(ownerOf(block("gems/arc level 21"))).toBe("gems/arc");
  });

  it("names no owner when the note has no text", () => {
    expect(ownerOf(block(""))).toBeUndefined();
  });

  it("names the owner when the note starts with a space", () => {
    expect(ownerOf(block(" key"))).toBe("key");
  });
});
