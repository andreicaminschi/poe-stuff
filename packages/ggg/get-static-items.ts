import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type { GggContext, StaticItem, TradeStaticResponse } from "./types.ts";

const HOUR_MS = 3_600_000;

/** The id every divider row carries. Not an item id, and not unique. */
const SEPARATOR = "sep";

/**
 * Every item the trade site names rather than searches for by base type, from
 * `GET /data/static` — the currencies, fragments, scarabs, essences, oils and the rest of
 * what the exchange trades, each with the id that names it on the wire.
 *
 * That id is the join this endpoint exists for: `fetchCurrencyHour` returns markets keyed
 * by it and nothing else in the API says what one is called. The group is the second
 * reason — it is GGG dividing currency into its kinds, which `/data/items` does not do.
 *
 * The groups are flattened, with `category` and `label` stamped on each row, exactly as
 * `getItemBases` treats the item groups. A row is useless without knowing which group it
 * came from, and callers that want one kind filter on `category`. The divider rows go,
 * so every row that comes back is an item and every `id` appears once.
 *
 * Its own endpoint and its own cache entry: this shares no payload with `/data/items`.
 * The hour is part of the key, so an entry is only read back within the hour that wrote
 * it, and `CACHE_DIR` naming a folder is the whole switch — unset means every call goes
 * to GGG, which is what production wants. The context's `cache` is deliberately not
 * forwarded to `call`, which keys on the request and never expires.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function getStaticItems({
  limiter,
  onEvent,
}: GggContext): Promise<readonly StaticItem[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly StaticItem[]>(root);
  const key = cacheKey("data-static", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const body = await call<TradeStaticResponse>(`${tradeApiUrl()}/data/static`, {
    limiter,
    onEvent,
  });

  // The `sep` rows are the dividers the exchange draws between blocks of buttons — 23 of
  // them, sharing the one id, some carrying a sub-heading in `text` and some blank. They
  // are layout, not items, and dropping them is what makes `id` unique across the list.
  const items = body.result.flatMap((group) =>
    group.entries.flatMap((entry) =>
      entry.id === SEPARATOR
        ? []
        : [{ ...entry, category: group.id, label: group.label }],
    ),
  );

  await cache?.set(key, items);

  return items;
}
