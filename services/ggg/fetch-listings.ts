import { call } from "./call.ts";
import type {
  GGGListingPage,
  GGGListingsResponseData,
} from "./fetch-listings.types.ts";
import type { GggContext } from "./types.ts";

/** GGG answers a longer list with a 400 rather than a truncated page. */
export const HASHES_PER_PAGE = 10;

export const createFetchPageRequest = (
  hashes: readonly string[],
  searchId: string,
  tradeApiUrl: string,
): { url: string } => ({
  url: `${tradeApiUrl}/fetch/${hashes.join(",")}?query=${encodeURIComponent(searchId)}`,
});

export function pageHashes(
  hashes: readonly string[],
  maxPages?: number,
): readonly (readonly string[])[] {
  const wanted =
    maxPages === undefined ? hashes : hashes.slice(0, maxPages * HASHES_PER_PAGE);

  const pages: string[][] = [];
  for (let start = 0; start < wanted.length; start += HASHES_PER_PAGE) {
    pages.push([...wanted.slice(start, start + HASHES_PER_PAGE)]);
  }

  return pages;
}

/** One page of listings, at most `HASHES_PER_PAGE` of them. */
export async function fetchListings(
  hashes: readonly string[],
  searchId: string,
  page: number,
  { limiter, tradeApiUrl, userAgent, cache, onEvent }: GggContext,
): Promise<GGGListingPage> {
  const request = createFetchPageRequest(hashes, searchId, tradeApiUrl);

  const response = await call<GGGListingsResponseData>(request.url, {
    userAgent,
    limiter,
    cache,
    onEvent,
  });

  return { searchId, page, listings: response.result };
}

/**
 * Every page a search's hashes are worth, fetched one after another. Sequential on
 * purpose: the pages share one limiter, and a queued request is not a faster request.
 */
export async function fetchAllListings(
  hashes: readonly string[],
  searchId: string,
  context: GggContext,
  maxPages?: number,
): Promise<readonly GGGListingPage[]> {
  const pages: GGGListingPage[] = [];

  for (const [page, chunk] of pageHashes(hashes, maxPages).entries()) {
    pages.push(await fetchListings(chunk, searchId, page, context));
  }

  return pages;
}
