import { readFileSync } from "node:fs";
import type { TaxonomyTable } from "./types.ts";
import { validateTaxonomyTable } from "./validate-table.ts";

/**
 * Every version this app can publish.
 *
 * A new league is a new file in `versions/` — a whole copy of the one before it, edited by
 * hand — and a line here. Nothing inherits from anything: a version is readable on its own,
 * and what changed is what a diff between two files shows.
 */
export const VERSIONS: readonly string[] = ["3.29"];

const loaded = new Map<string, TaxonomyTable>();

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
 * The result is kept, so a version is read and validated once per process.
 */
export function versionTable(version: string): TaxonomyTable {
  const already = loaded.get(version);

  if (already !== undefined) {
    return already;
  }

  if (!VERSIONS.includes(version)) {
    throw new Error(
      `No table for ${version}. Known: ${VERSIONS.join(", ")}`,
    );
  }

  const file = `versions/${version}.json`;
  const table = validateTaxonomyTable(
    JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8")),
    file,
  );

  loaded.set(version, table);

  return table;
}
