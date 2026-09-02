import { versionKey } from "./lake.ts";
import type { Lake, Version } from "./types.ts";

/**
 * Writes one version, once.
 *
 * **A published version is immutable.** Something already read this file and classified a
 * run against it; rewriting it would change what that run meant after the fact, with
 * nothing recording that it happened. A correction is the next version, not an edit.
 *
 * **`force` is the exception, and it is for a version still being written.** A hand pass
 * over a league's table is dozens of edits, and every one of them needs a run to look at
 * before the next. Burning a version number per edit would leave a shelf of versions that
 * only ever existed to be replaced. Once anyone else reads a version, the rule above is
 * the rule again.
 */
export async function publishTaxonomy(
  lake: Lake,
  version: string,
  table: Version,
  force = false,
): Promise<string> {
  const key = versionKey(version);

  if (!force && (await lake.exists(key))) {
    throw new Error(
      `${version} is already published. Publish a new version, or pass --force to overwrite it.`,
    );
  }

  // The variants are authored in their own file and published on the row, so the reader
  // sees one shape per row and never learns there were two files. Both tables of rows get
  // the same treatment.
  const fold = <T extends object>(rows: Readonly<Record<string, T>>) =>
    Object.fromEntries(
      Object.entries(rows).map(([id, row]) => {
        const variants = table.variants[id];

        return [id, variants === undefined ? row : { ...row, variants }];
      }),
    );

  await lake.writeJson(key, {
    version,
    items: fold(table.items),
    categories: table.categories,
    authored: fold(table.authored),
  });

  return key;
}
