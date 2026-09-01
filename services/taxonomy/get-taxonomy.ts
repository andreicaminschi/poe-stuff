import { pointerKey, versionKey } from "./config.ts";
import { TaxonomyNotFoundError } from "./errors.ts";
import type { Taxonomy, TaxonomyPointer } from "./get-taxonomy.types.ts";
import type { TaxonomyStore } from "./types.ts";

async function readOrThrow(store: TaxonomyStore, key: string): Promise<unknown> {
  const payload = await store.read(key);
  if (payload === undefined) throw new TaxonomyNotFoundError(key);
  return payload;
}

/**
 * One published version of the taxonomy, or the one that is current.
 *
 * **Naming no version costs a second read.** `latest.json` holds a version rather than a
 * copy of the table, so promoting a version is one small write and no taxonomy is ever
 * stored twice. The cost is that resolving `latest` reads the pointer and then the version.
 *
 * A caller that wants a run to stay reproducible resolves the version once and passes it
 * from then on — reading `latest` twice in one run can straddle a promote and answer with
 * two different tables.
 */
export async function getTaxonomy(
  store: TaxonomyStore,
  prefix: string,
  version?: string,
): Promise<Taxonomy> {
  const resolved =
    version ??
    ((await readOrThrow(store, pointerKey(prefix))) as TaxonomyPointer).version;

  return (await readOrThrow(store, versionKey(prefix, resolved))) as Taxonomy;
}
