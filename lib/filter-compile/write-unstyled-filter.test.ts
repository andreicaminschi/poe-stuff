import { describe, it, expect } from "@jest/globals";
import { formatNote } from "@poe/filter-eval/format-note";
import { writeUnstyledFilter, type CompileRow } from "./write-unstyled-filter.ts";
import type { CategoryRecords } from "./resolve-row.ts";

const note = (key: string) => formatNote({ tier: "varies", verb: "check" }, key);

const rowOf = (
  key: string,
  category: string,
  subcategory: string | null,
  extra: Partial<CompileRow> = {},
): CompileRow => ({
  key,
  name: key,
  category,
  subcategory,
  baseTypes: [key],
  conditions: [{ condition: "BaseType", from: "name" }],
  ...extra,
});

const baseTypesIn = (text: string) => [...text.matchAll(/BaseType "(\w+)"/g)].map((m) => m[1]);

describe("writeUnstyledFilter", () => {
  describe("blocks", () => {
    it("writes an empty filter when there are no rows", () => {
      const result = writeUnstyledFilter([], {});

      expect(result).toEqual({ text: "", blocks: 0, skipped: [] }); // no lone trailing newline
    });

    it("writes one row as a Show block with its conditions indented and a note naming the row", () => {
      const result = writeUnstyledFilter([rowOf("Ring", "jewellery", null)], {});

      expect(result).toEqual({ text: `Show\n  BaseType "Ring"\n  ${note("Ring")}\n`, blocks: 1, skipped: [] });
    });

    it("puts a blank line between two blocks", () => {
      const result = writeUnstyledFilter([rowOf("A", "x", null), rowOf("B", "x", null)], {});

      expect(result.text).toBe(`Show\n  BaseType "A"\n  ${note("A")}\n\nShow\n  BaseType "B"\n  ${note("B")}\n`);
    });

    it("writes a row with two variants as two blocks, each note naming the row then the variant", () => {
      const variants = [
        { name: "c", conditions: [{ condition: "Corrupted", value: true }] },
        { name: "u", conditions: [{ condition: "Corrupted", value: false }] },
      ];

      const result = writeUnstyledFilter([rowOf("A", "x", null, { variants })], {});

      expect(result.blocks).toBe(2);
      expect(result.text).toContain(note("A c"));
      expect(result.text).toContain(note("A u")); // key and variant joined by a space
    });

    it("draws a row with no conditions of its own when its category supplies one", () => {
      const categories = { x: { conditions: [{ condition: "Class", value: "Rings" }] } };

      const result = writeUnstyledFilter([rowOf("A", "x", null, { conditions: undefined })], categories);

      expect(result.text).toBe(`Show\n  Class "Rings"\n  ${note("A")}\n`); // any level counts
    });
  });

  describe("skipping", () => {
    it("skips a row with no conditions at any level", () => {
      const result = writeUnstyledFilter([rowOf("A", "x", null, { conditions: [] })], {});

      expect(result).toEqual({ text: "", blocks: 0, skipped: [{ key: "A", problem: "has no conditions yet" }] }); // would match every item
    });

    it("skips a row with two resolution problems and reports only the first", () => {
      const conditions = [
        { condition: "BaseType", from: "name" },
        { condition: "X", from: "y" },
      ];

      const result = writeUnstyledFilter([rowOf("A", "x", null, { name: "", conditions })], {});

      expect(result.skipped).toEqual([{ key: "A", problem: "reads its name, which is empty" }]);
    });

    it("skips only the failing variant and names it, while the other variant is still drawn", () => {
      const variants = [
        { name: "ok", conditions: [] },
        { name: "bad", conditions: [{ condition: "Nope", value: 1 }] },
      ];

      const result = writeUnstyledFilter([rowOf("A", "x", null, { variants })], {});

      expect(result.blocks).toBe(1);
      expect(result.skipped).toEqual([{ key: "A", variant: "bad", problem: "\"Nope\" is not a filter condition" }]);
    });

    it("skips a row whose value holds a hash, which the game would read as a comment", () => {
      const result = writeUnstyledFilter([rowOf("A#1", "x", null)], {});

      expect(result.skipped).toEqual([{ key: "A#1", problem: "has a # in a value, which would start a comment" }]);
    });
  });

  describe("order", () => {
    it("keeps categories in the order they first appear, pulling a later row up beside its category", () => {
      const rows = [rowOf("B1", "b", null), rowOf("A1", "a", null), rowOf("B2", "b", null)];

      const result = writeUnstyledFilter(rows, {});

      expect(baseTypesIn(result.text)).toEqual(["B1", "B2", "A1"]); // first-seen index per category
    });

    it("orders subcategories by their order number, then unordered ones and top-level rows in input order", () => {
      const categories: CategoryRecords = {
        "x/late": { conditions: [], order: 2 },
        "x/early": { conditions: [], order: 1 },
      };
      const rows = [rowOf("U", "x", "none"), rowOf("L", "x", "late"), rowOf("N", "x", null), rowOf("E", "x", "early")];

      const result = writeUnstyledFilter(rows, categories);

      expect(baseTypesIn(result.text)).toEqual(["E", "L", "U", "N"]); // missing order sorts as MAX_SAFE_INTEGER, stable
    });

    it("puts a catch-all subcategory after every block of every other category, even with order zero", () => {
      const categories: CategoryRecords = { "x/rest": { conditions: [], catchAll: true, order: 0 } };
      const rows = [rowOf("R", "x", "rest"), rowOf("A", "x", null), rowOf("B", "y", null)];

      const result = writeUnstyledFilter(rows, categories);

      expect(baseTypesIn(result.text)).toEqual(["A", "B", "R"]); // catchAll overrides category rank
    });
  });
});
