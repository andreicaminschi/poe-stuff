import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type { GggContext, SearchResponse } from "./types.ts";

/** The context is passed in: the limiter and the cache belong to the caller, not here. */
export function search(
  query: unknown,
  league: string,
  { limiter, cache, onEvent }: GggContext,
): Promise<SearchResponse> {
  const url = `${tradeApiUrl()}/search/${encodeURIComponent(league)}`;

  return call<SearchResponse>(url, {
    limiter,
    cache,
    onEvent,
    init: { method: "POST", body: JSON.stringify(query) },
  });
}
