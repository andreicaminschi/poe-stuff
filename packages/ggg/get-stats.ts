import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type {
  GggContext,
  TradeStatEntry,
  TradeStatsResponse,
} from "./types.ts";

const HOUR_MS = 3_600_000;

/**
 * Every stat the trade site will search on, from `GET /data/stats` — the id a filter
 * carries and the text it reads as, with each rolled number written `#`.
 *
 * The groups are flattened away. Each entry already repeats its group in `type`, and the
 * one thing callers do with this list is look a line of item text up in it, which no
 * grouping helps with. The pseudo group comes through with the rest: "has influence" and
 * the other derived searches live there and nowhere else.
 *
 * Cached exactly like `getUniqueItems`, for the same reasons — it is most of a megabyte
 * that moves once a league, the hour is the expiry, and `CACHE_DIR` naming a folder is
 * the whole switch. The context's `cache` is again deliberately not forwarded to `call`:
 * that one never expires and would pin this list for the life of the folder.
 *
 * The body is asserted, not validated: callers that care hand the result to a schema.
 */
export async function getStats({
  limiter,
  onEvent,
}: GggContext): Promise<readonly TradeStatEntry[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly TradeStatEntry[]>(root);
  const key = cacheKey("trade-stats", String(Math.floor(Date.now() / HOUR_MS)));

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const body = await call<TradeStatsResponse>(`${tradeApiUrl()}/data/stats`, {
    limiter,
    onEvent,
  });

  const stats = body.result.flatMap((group) => group.entries);

  await cache?.set(key, stats);

  return stats;
}
