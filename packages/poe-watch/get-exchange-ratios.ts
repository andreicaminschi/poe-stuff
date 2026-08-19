import { cacheKey } from "@util/core/cache-key";
import { optionalEnv, requireEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import type {
  ExchangeRatioItem,
  ExchangeRatiosResponse,
  Game,
} from "./types.ts";

const HOUR_MS = 3_600_000;

/** Base of the PoeWatch API. The trailing slash is stripped so joins stay predictable. */
const apiUrl = () => requireEnv("POE_WATCH_BASE_URL").replace(/\/$/, "");

/**
 * Every item's Chaos and Divine exchange ratios for one league, from
 * `GET /exchange/ratios`.
 *
 * `game` is part of the request, not a base-url choice — one API serves both games, and
 * league names collide across them, so it is also part of the cache key.
 *
 * Cached exactly like `/compact`: the hour is in the key, so an entry is only ever read
 * back within the hour that wrote it. PoeWatch recomputes on the hour, so nothing older
 * is worth keeping. `POE_WATCH_CACHE_DIR` naming a folder is the whole switch — unset
 * means every call goes to PoeWatch.
 *
 * The envelope carries nothing but `items`, so the array is what comes back. The body is
 * asserted, not validated: callers that care hand the result to a schema.
 */
export async function getExchangeRatios(
  league: string,
  game: Game,
): Promise<readonly ExchangeRatioItem[]> {
  const root = optionalEnv("POE_WATCH_CACHE_DIR");
  const cache =
    root === undefined
      ? undefined
      : fileCache<readonly ExchangeRatioItem[]>(root);
  const key = cacheKey(
    "poe-watch-exchange-ratios",
    league,
    game,
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const url = `${apiUrl()}/exchange/ratios?league=${encodeURIComponent(league)}&game=${game}`;

  const response = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`poewatch ${response.status} for ${url}`);
  }

  const body = (await response.json()) as ExchangeRatiosResponse;
  await cache?.set(key, body.items);

  return body.items;
}
