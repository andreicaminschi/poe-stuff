import { fetchItems } from "./fetch-items.ts";
import type { GggContext, UniqueItem } from "./types.ts";

/**
 * Every unique the trade site will search on, from `GET /data/items` — its name and its
 * base item, and nothing else. The endpoint returns every item GGG knows, grouped into
 * broad buckets; `flags.unique` is the only thing separating a unique from its base, and
 * an entry without a `name` is a base rather than a unique.
 *
 * The download and its hour-keyed cache belong to `fetchItems`, which `getItemBases`
 * reads too — calling both in one hour costs one request.
 */
export async function getUniqueItems(
  context: GggContext,
): Promise<readonly UniqueItem[]> {
  const groups = await fetchItems(context);

  // flatMap rather than filter-then-map: returning [] for a miss is what narrows
  // `name` away from `string | undefined` without an assertion.
  return groups.flatMap((group) =>
    group.entries.flatMap(({ name, type, flags }) =>
      flags?.unique === true && name !== undefined ? [{ name, type }] : [],
    ),
  );
}
