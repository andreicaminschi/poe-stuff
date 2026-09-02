import { readFileSync } from "node:fs";
import type { Version } from "./types.ts";
import { validateCategoryTable } from "./validate-conditions.ts";
import { validateAuthoredTable } from "./validate-authored.ts";
import { validateTaxonomyTable } from "./validate-table.ts";
import { validateVariantTable } from "./validate-variants.ts";

/**
 * Every version this app can publish.
 *
 * A new league is a new file in `versions/` — a whole copy of the one before it, edited by
 * hand — and a line here. Nothing inherits from anything: a version is readable on its own,
 * and what changed is what a diff between two files shows.
 */
export const VERSIONS: readonly string[] = ["3.29"];

const loaded = new Map<string, Version>();

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));

/**
 * One version's table, read from `versions/<version>.json` and validated.
 *
 * **The JSON file is the source of truth.** It is what `jq` edits and what gets published,
 * so it is read at the moment it is asked for rather than compiled in — and validated on
 * the way through, because nothing else checks a `.json`.
 *
 * Every row was seeded once and is hand-maintained from there. The category came from the
 * group the trade site listed the name under, falling back to a slug of RePoE's
 * `item_class`; the subcategory came from the art folder the base sits in. That seed is a
 * starting point and not an authority.
 *
 * **Edit `category` and `subcategory`. Never edit `original`.** It holds what the seed
 * said, so a row the two disagree on is a decision somebody made on purpose, and a row they
 * agree on is one nobody has ruled on yet.
 *
 * **Six files, one version.** The items are thousands of rows, the categories are dozens,
 * and the authored rows and the variants are two files each: the ones the seed wrote and the
 * ones a person did. Merging them would mean scrolling past every item to reach any of the
 * others. They are published as one object; they are edited as six files — four of them by
 * hand, and the two `.seeded.json` by `yarn taxonomy:seed` alone.
 *
 * The result is kept, so a version is read and validated once per process.
 */
export function versionTable(version: string): Version {
  const already = loaded.get(version);

  if (already !== undefined) {
    return already;
  }

  if (!VERSIONS.includes(version)) {
    throw new Error(
      `No table for ${version}. Known: ${VERSIONS.join(", ")}`,
    );
  }

  const itemsFile = `versions/${version}.json`;
  const categoriesFile = `versions/${version}.categories.json`;
  const pair = (table: string) =>
    [`versions/${version}.${table}.seeded.json`, `versions/${version}.${table}.manual.json`] as const;

  // Rows first: the variants are checked against them, so every key names a real one. Each
  // file is validated on its own, so a message names the one that is wrong. Then seeded
  // under manual: a manual key replaces the seeded entry whole, not field by field.
  const items = validateTaxonomyTable(readJson(itemsFile), itemsFile);

  const [authoredSeeded, authoredManual] = pair("authored");
  const authored = {
    ...validateAuthoredTable(readJson(authoredSeeded), authoredSeeded),
    ...validateAuthoredTable(readJson(authoredManual), authoredManual),
  };

  const known = new Set([...Object.keys(items), ...Object.keys(authored)]);

  const [variantsSeeded, variantsManual] = pair("variants");
  const variants = {
    ...validateVariantTable(readJson(variantsSeeded), known, variantsSeeded),
    ...validateVariantTable(readJson(variantsManual), known, variantsManual),
  };

  const table: Version = {
    items,
    categories: validateCategoryTable(readJson(categoriesFile), categoriesFile),
    authored,
    variants,
  };

  loaded.set(version, table);

  return table;
}
