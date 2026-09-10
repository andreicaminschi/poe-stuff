import type { SourceFile, VersionFiles } from "./types.ts";
import { collectAuthoredTable } from "./validate-authored.ts";
import { collectCategoryTable } from "./validate-conditions.ts";
import { collectTaxonomyTable } from "./validate-table.ts";
import { collectVariantTable } from "./validate-variants.ts";
import { TableShapeError, type RowProblem } from "./validate.ts";

export type VersionProblem = RowProblem & {
  readonly file: SourceFile;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const keysOf = (value: unknown): readonly string[] =>
  isObject(value) ? Object.keys(value) : [];

function inFile(
  file: SourceFile,
  run: () => readonly RowProblem[],
): readonly VersionProblem[] {
  try {
    return run().map((problem) => ({ ...problem, file }));
  } catch (error) {
    if (error instanceof TableShapeError) {
      return [{ file, key: file, problem: "is not an object" }];
    }

    throw error;
  }
}

export function collectVersion(files: VersionFiles): readonly VersionProblem[] {
  const known = new Set([
    ...keysOf(files.items),
    ...keysOf(files["authored.seeded"]),
    ...keysOf(files["authored.manual"]),
  ]);

  return [
    ...inFile("items", () => collectTaxonomyTable(files.items, "items")),
    ...inFile("categories", () => collectCategoryTable(files.categories, "categories")),
    ...inFile("authored.seeded", () =>
      collectAuthoredTable(files["authored.seeded"], "authored.seeded"),
    ),
    ...inFile("authored.manual", () =>
      collectAuthoredTable(files["authored.manual"], "authored.manual"),
    ),
    ...inFile("variants.seeded", () =>
      collectVariantTable(files["variants.seeded"], known, "variants.seeded"),
    ),
    ...inFile("variants.manual", () =>
      collectVariantTable(files["variants.manual"], known, "variants.manual"),
    ),
  ];
}
