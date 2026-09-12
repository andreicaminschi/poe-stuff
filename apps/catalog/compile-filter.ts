import { conditionLine } from "@poe/filter-compile/condition-line";
import { resolveForms, type Form } from "@poe/filter-compile/resolve-row";
import { formatNote } from "@poe/filter-eval/format-note";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import type { TaxonomyCategories } from "@poe/taxonomy/get-categories.types";
import type { Item } from "./item.ts";

export type Skip = { readonly key: string; readonly variant?: string; readonly problem: string };

export type Compiled = { readonly text: string; readonly blocks: number; readonly skipped: readonly Skip[] };

type Block = { readonly text: string } | { readonly problem: string };

function blockOf(row: Item, form: Form): Block {
  const [first] = form.problems;
  if (first !== undefined) return { problem: first };
  if (form.conditions.length === 0) return { problem: "has no conditions yet" };

  const written: string[] = [];
  for (const result of form.conditions.map(conditionLine)) {
    if ("problem" in result) return { problem: result.problem };
    written.push(result.line);
  }

  if (written.some((line) => line.includes("#"))) {
    return { problem: "has a # in a value, which would start a comment" };
  }

  const note = formatNote(
    { tier: "varies", verb: "check" },
    form.variant === undefined ? row.key : `${row.key} ${form.variant}`,
  );

  return { text: ["Show", ...written.map((line) => `  ${line}`), `  ${note}`].join("\n") };
}

/**
 * The catalog's rows as a `.filter`: one `Show` block per row, or per variant when a row has
 * any, holding the conditions the shared resolver gives it and nothing else.
 *
 * **A row is drawn when any level has a condition**: its category, its subcategory, the row
 * itself or the variant. A row with none is skipped as "has no conditions yet", and so is one
 * with a resolution problem or a condition no line can hold, each with its reason.
 * The text is read back with `parseFilter` before it is returned, so a grammar mistake fails
 * here and not in the game client.
 */
export function compileFilter(rows: readonly Item[], categories: TaxonomyCategories["categories"]): Compiled {
  const texts: string[] = [];
  const skipped: Skip[] = [];

  for (const row of rows) {
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
      const block = blockOf(row, form);

      if ("problem" in block) {
        skipped.push({ key: row.key, ...(form.variant === undefined ? {} : { variant: form.variant }), problem: block.problem });
      } else {
        texts.push(block.text);
      }
    }
  }

  const text = texts.length === 0 ? "" : `${texts.join("\n\n")}\n`;
  const parsed = parseFilter(text);

  if (parsed.length !== texts.length) {
    throw new Error(`compiled ${texts.length} blocks, but the parser read back ${parsed.length}`);
  }

  return { text, blocks: texts.length, skipped };
}
