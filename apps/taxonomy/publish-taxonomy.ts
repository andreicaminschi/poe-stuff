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

  await lake.writeJson(key, {
    version,
    items: table.items,
    categories: table.categories,
  });

  return key;
}
