import { call } from "@poe/ggg/call";
import { tradeApiUrl } from "./config.ts";
import type { FetchResponse, TradeContext } from "./types.ts";

/** One page of results. `hashes` is expected to be at most `FETCH_CHUNK` long. */
export function fetchPage(
  hashes: readonly string[],
  searchId: string,
  { limiter, cache, onEvent }: TradeContext,
): Promise<FetchResponse> {
  const url = `${tradeApiUrl()}/fetch/${hashes.join(",")}?query=${encodeURIComponent(searchId)}`;

  return call<FetchResponse>(url, { limiter, cache, onEvent });
}
