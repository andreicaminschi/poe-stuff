import type { SourceFile, VersionFiles } from "./types.ts";
import { collectAuthoredTable } from "./validate-authored.ts";
import { collectBaseTypes, seedNames } from "./validate-base-types.ts";
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

export function collectVersion(
  files: VersionFiles,
  rejected: ReadonlySet<string>,
): readonly VersionProblem[] {
  const known = new Set([
    ...keysOf(files.items),
    ...keysOf(files["authored.seeded"]),
    ...keysOf(files["authored.manual"]),
  ]);
  const seeds = seedNames(files.items);

  return [
    ...inFile("items", () => collectTaxonomyTable(files.items, "items")),
    ...inFile("categories", () => collectCategoryTable(files.categories, "categories")),
    ...inFile("authored.seeded", () => [
      ...collectAuthoredTable(files["authored.seeded"], "authored.seeded"),
      ...collectBaseTypes(files["authored.seeded"], seeds, rejected),
    ]),
    ...inFile("authored.manual", () => [
      ...collectAuthoredTable(files["authored.manual"], "authored.manual"),
      ...collectBaseTypes(files["authored.manual"], seeds, rejected),
    ]),
    ...inFile("variants.seeded", () =>
      collectVariantTable(files["variants.seeded"], known, "variants.seeded"),
    ),
    ...inFile("variants.manual", () =>
      collectVariantTable(files["variants.manual"], known, "variants.manual"),
    ),
  ];
}
