import { versionKey } from "./lake.ts";
import type { Lake, TaxonomyTable } from "./types.ts";

/**
 * Writes one version, once.
 *
 * **A published version is immutable.** Something already read this file and classified a
 * run against it; rewriting it would change what that run meant after the fact, with
 * nothing recording that it happened. A correction is the next version, not an edit.
 */
export async function publishTaxonomy(
  lake: Lake,
  version: string,
  items: TaxonomyTable,
): Promise<string> {
  const key = versionKey(version);

  if (await lake.exists(key)) {
    throw new Error(`${version} is already published. Publish a new version instead.`);
  }

  await lake.writeJson(key, { version, items });

  return key;
}
