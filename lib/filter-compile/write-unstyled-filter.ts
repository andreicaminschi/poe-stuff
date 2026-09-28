import { formatNote } from "@poe/filter-eval/format-note";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { writeConditionLines } from "./write-condition-line.ts";
import { writeOwnerNote } from "./owner-note.ts";
import { resolveForms, type CategoryRecords, type Form } from "./resolve-row.ts";
import type { Condition } from "./types.ts";

/** What `writeUnstyledFilter` reads off a row. */
export type CompileRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly baseTypes: readonly string[];
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly { readonly name: string; readonly conditions: readonly Condition[] }[];
};

export type Skip = { readonly key: string; readonly variant?: string; readonly problem: string };

export type Compiled = { readonly text: string; readonly blocks: number; readonly skipped: readonly Skip[] };

/** Finds the subcategory record a row belongs to, or nothing for a top-level row. */
function findCategoryRecord(categories: CategoryRecords, row: CompileRow) {
  return row.subcategory === null
    ? undefined
    : categories[`${row.category}/${row.subcategory}`];
}

/**
 * Orders rows so the filter's blocks come out in the right priority: categories in the order
 * they first appear, each category's subcategories by `order`, and every catch-all last so it
 * only takes what the other blocks miss.
 */
function orderRows(rows: readonly CompileRow[], categories: CategoryRecords): readonly CompileRow[] {
  const firstSeen = new Map<string, number>();
  rows.forEach((row, index) => {
    if (!firstSeen.has(row.category)) firstSeen.set(row.category, index);
  });
  return rows
    .map((row, index) => {
      const record = findCategoryRecord(categories, row);
      const rank = record?.order ?? Number.MAX_SAFE_INTEGER;
      const category = record?.catchAll === true
        ? Number.MAX_VALUE
        : (firstSeen.get(row.category) ?? 0);
      return { row, index, category, rank };
    })
    .sort((a, b) => a.category - b.category || a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);
}

type Block = { readonly text: string } | { readonly problem: string };

/** Writes one form of a row as a `Show` block, or says why it cannot be drawn. */
function writeBlock(row: CompileRow, form: Form): Block {
  const [first] = form.problems;
  if (first !== undefined) return { problem: first };
  if (form.conditions.length === 0) return { problem: "has no conditions yet" };

  const written = writeConditionLines(form.conditions);
  if ("problem" in written) return written;

  const note = formatNote({ tier: "varies", verb: "check" }, writeOwnerNote(row.key, form.variant));

  return { text: ["Show", ...written.lines.map((line) => `  ${line}`), `  ${note}`].join("\n") };
}

/**
 * Writes the catalog's rows as an unstyled `.filter`, so the taxonomy's conditions can be
 * checked by the game client and the validator before any styling exists.
 *
 * One `Show` block per row, or per variant when a row has any, holding the conditions the
 * shared resolver gives it and nothing else. Within a
 * category, subcategories compile in `order`. A `catchAll` subcategory compiles after
 * every other block in the filter.
 *
 * **A row is drawn when any level has a condition**: its category, its subcategory, the row
 * itself or the variant. A row with none is skipped as "has no conditions yet", and so is one
 * with a resolution problem or a condition no line can hold, each with its reason.
 * The text is read back with `parseFilter` before it is returned, so a grammar mistake fails
 * here and not in the game client.
 *
 * @example
 * writeUnstyledFilter(
 *   [{ key: "Ruby Ring", name: "Ruby Ring", category: "rings", subcategory: "any", baseTypes: ["Ruby Ring"] },
 *    { key: "Iron Ring", name: "Iron Ring", category: "rings", subcategory: "any", baseTypes: [] }],
 *   { "rings/any": { conditions: [{ condition: "BaseType", operator: "==", from: "baseTypes" }] } },
 * );
 * // → { text: "Show\n  BaseType == \"Ruby Ring\"\n  #@ tier=varies verb=check Ruby Ring\n",
 * //     blocks: 1,
 * //     skipped: [{ key: "Iron Ring", problem: "reads its base types, which are empty" }] }
 */
export function writeUnstyledFilter(rows: readonly CompileRow[], categories: CategoryRecords): Compiled {
  const texts: string[] = [];
  const skipped: Skip[] = [];

  for (const row of orderRows(rows, categories)) {
    const forms = resolveForms(
      categories,
      {
        name: row.name,
        baseTypes: row.baseTypes,
        category: row.category,
        subcategory: row.subcategory,
        conditions: row.conditions ?? [],
      },
      row.variants,
    );

    for (const form of forms) {
      const block = writeBlock(row, form);

      if ("problem" in block) {
        skipped.push({
          key: row.key,
          ...(form.variant === undefined
            ? {}
            : { variant: form.variant }),
          problem: block.problem,
        });
      } else {
        texts.push(block.text);
      }
    }
  }

  const text = texts.length === 0
    ? ""
    : `${texts.join("\n\n")}\n`;
  const parsed = parseFilter(text);

  if (parsed.length !== texts.length) {
    throw new Error(`compiled ${texts.length} blocks, but the parser read back ${parsed.length}`);
  }

  return { text, blocks: texts.length, skipped };
}
