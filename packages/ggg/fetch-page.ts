import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type { FetchResponse, GggContext } from "./types.ts";

/**
 * One page of results. GGG takes at most ten hashes per call, and says so with a 400
 * rather than a truncated page — the caller does the chunking.
 */
export function fetchPage(
  hashes: readonly string[],
  searchId: string,
  { limiter, cache, onEvent }: GggContext,
): Promise<FetchResponse> {
  const url = `${tradeApiUrl()}/fetch/${hashes.join(",")}?query=${encodeURIComponent(searchId)}`;

  return call<FetchResponse>(url, { limiter, cache, onEvent });
}
