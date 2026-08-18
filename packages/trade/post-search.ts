import { call } from "@poe/ggg/call";
import { tradeApiUrl } from "./config.ts";
import type { SearchResponse, TradeContext } from "./types.ts";

/** The context is passed in: the limiter and the cache belong to the worker, not here. */
export function postSearch(
  query: unknown,
  league: string,
  { limiter, cache, onEvent }: TradeContext,
): Promise<SearchResponse> {
  const url = `${tradeApiUrl()}/search/${encodeURIComponent(league)}`;

  return call<SearchResponse>(url, {
    limiter,
    cache,
    onEvent,
    init: { method: "POST", body: JSON.stringify(query) },
  });
}
