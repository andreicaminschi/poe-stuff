import { items as v3_29 } from "./versions/3.29.ts";
import type { TaxonomyTable } from "./types.ts";

/**
 * Every version this app can publish.
 *
 * A new league is a new file in `versions/` — a whole copy of the one before it, edited by
 * hand — and a line here. Nothing inherits from anything: a version is readable on its own,
 * and what changed is what a diff between two files shows.
 */
export const VERSIONS: Readonly<Record<string, TaxonomyTable>> = {
  "3.29": v3_29,
};

export function versionTable(version: string): TaxonomyTable {
  const table = VERSIONS[version];

  if (table === undefined) {
    throw new Error(
      `No table for ${version}. Known: ${Object.keys(VERSIONS).join(", ")}`,
    );
  }

  return table;
}
