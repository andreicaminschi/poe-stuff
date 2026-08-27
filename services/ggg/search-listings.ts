import { call } from "./call.ts";
import type {
  GGGListingSearch,
  GGGSearchResponseData,
} from "./search-listings.types.ts";
import type { GggContext } from "./types.ts";

export const mapGGGSearchResponseDataToGGGListingSearch = (
  data: GGGSearchResponseData,
): GGGListingSearch => ({
  searchId: data.id,
  hashes: data.result,
  matchCount: data.total,
  complexity: data.complexity,
});

export const createTradeSearchRequest = (
  query: unknown,
  league: string,
  tradeApiUrl: string,
): { url: string; init: RequestInit } => ({
  url: `${tradeApiUrl}/search/${encodeURIComponent(league)}`,
  init: { method: "POST", body: JSON.stringify(query) },
});

/**
 * Runs one trade search and answers with the listing hashes it matched, which
 * `fetchListings` turns into listings. GGG caps the hashes at 100 however many the
 * search actually matched.
 */
export async function searchListings(
  query: unknown,
  league: string,
  { limiter, tradeApiUrl, userAgent, cache, onEvent }: GggContext,
): Promise<GGGListingSearch> {
  const request = createTradeSearchRequest(query, league, tradeApiUrl);

  const response = await call<GGGSearchResponseData>(request.url, {
    userAgent,
    limiter,
    cache,
    onEvent,
    init: request.init,
  });

  return mapGGGSearchResponseDataToGGGListingSearch(response);
}
