import { describe, it, expect } from "@jest/globals";
import { formatNote } from "@poe/filter-eval/format-note";
import { compileFilter, type CompileRow } from "./compile-filter.ts";
import type { CategoryRecords } from "./resolve-row.ts";

const note = (key: string) => formatNote({ tier: "varies", verb: "check" }, key);

const rowOf = (key: string, category: string, subcategory: string | null, extra: Partial<CompileRow> = {}): CompileRow => ({
  key,
  name: key,
  category,
  subcategory,
  baseTypes: [key],
  conditions: [{ condition: "BaseType", from: "name" }],
  ...extra,
});

const keysIn = (text: string) => [...text.matchAll(/^Show$/gm)].length;

describe("compileFilter", () => {
  it("writes an empty text with no blocks when there are no rows", () => {
    expect(compileFilter([], {})).toEqual({ text: "", blocks: 0, skipped: [] });
  });

  it("writes one Show block per row with indented conditions and a note naming the key", () => {
    const result = compileFilter([rowOf("Ring", "jewellery", null)], {});

    expect(result.text).toBe(`Show\n  BaseType "Ring"\n  ${note("Ring")}\n`);
    expect(result.blocks).toBe(1);
  });

  it("separates blocks with a blank line", () => {
    const result = compileFilter([rowOf("A", "x", null), rowOf("B", "x", null)], {});

    expect(result.text).toBe(`Show\n  BaseType "A"\n  ${note("A")}\n\nShow\n  BaseType "B"\n  ${note("B")}\n`);
  });

  it("writes one block per variant, with the variant after the key in the note", () => {
    const result = compileFilter(
      [
        rowOf("A", "x", null, {
          variants: [
            { name: "c", conditions: [{ condition: "Corrupted", value: true }] },
            { name: "u", conditions: [{ condition: "Corrupted", value: false }] },
          ],
        }),
      ],
      {},
    );

    expect(result.blocks).toBe(2);
    expect(result.text).toContain(note("A c"));
    expect(result.text).toContain(note("A u"));
  });

  it("draws a row with no conditions of its own when its category has some", () => {
    const result = compileFilter([rowOf("A", "x", null, { conditions: undefined })], {
      x: { conditions: [{ condition: "Class", value: "Rings" }] },
    });

    expect(result.blocks).toBe(1);
  });

  it("skips a row with no conditions at any level", () => {
    const result = compileFilter([rowOf("A", "x", null, { conditions: [] })], {});

    expect(result).toEqual({ text: "", blocks: 0, skipped: [{ key: "A", problem: "has no conditions yet" }] });
  });

  it("skips a row with a resolution problem, giving only the first problem", () => {
    const result = compileFilter(
      [rowOf("A", "x", null, { name: "", conditions: [{ condition: "BaseType", from: "name" }, { condition: "X", from: "y" }] })],
      {},
    );

    expect(result.skipped).toEqual([{ key: "A", problem: "reads its name, which is empty" }]);
  });

  it("skips a variant with its name when only that variant fails", () => {
    const result = compileFilter(
      [
        rowOf("A", "x", null, {
          variants: [
            { name: "ok", conditions: [] },
            { name: "bad", conditions: [{ condition: "Nope", value: 1 }] },
          ],
        }),
      ],
      {},
    );

    expect(result.blocks).toBe(1);
    expect(result.skipped).toEqual([{ key: "A", variant: "bad", problem: '"Nope" is not a filter condition' }]);
  });

  it("skips a row whose value holds a hash, which would start a comment", () => {
    const result = compileFilter([rowOf("A#1", "x", null)], {});

    expect(result.skipped).toEqual([{ key: "A#1", problem: "has a # in a value, which would start a comment" }]);
  });

  it("keeps categories in the order they first appear", () => {
    const result = compileFilter([rowOf("B1", "b", null), rowOf("A1", "a", null), rowOf("B2", "b", null)], {});

    expect([...result.text.matchAll(/BaseType "(\w+)"/g)].map((m) => m[1])).toEqual(["B1", "B2", "A1"]);
  }); // B2 pulled up to its category

  it("orders subcategories within a category by their order, unordered ones after, in input order", () => {
    const categories: CategoryRecords = {
      "x/late": { conditions: [], order: 2 },
      "x/early": { conditions: [], order: 1 },
    };

    const result = compileFilter(
      [rowOf("U", "x", "none"), rowOf("L", "x", "late"), rowOf("N", "x", null), rowOf("E", "x", "early")],
      categories,
    );

    expect([...result.text.matchAll(/BaseType "(\w+)"/g)].map((m) => m[1])).toEqual(["E", "L", "U", "N"]);
  });

  it("puts every catch-all subcategory after every other block in the filter", () => {
    const categories: CategoryRecords = { "x/rest": { conditions: [], catchAll: true, order: 0 } };

    const result = compileFilter([rowOf("R", "x", "rest"), rowOf("A", "x", null), rowOf("B", "y", null)], categories);

    expect([...result.text.matchAll(/BaseType "(\w+)"/g)].map((m) => m[1])).toEqual(["A", "B", "R"]);
  }); // catchAll beats order

  it("returns a text the filter parser reads back block for block", () => {
    const result = compileFilter([rowOf("A", "x", null), rowOf("B", "x", null)], {});

    expect(keysIn(result.text)).toBe(result.blocks);
  });
});
