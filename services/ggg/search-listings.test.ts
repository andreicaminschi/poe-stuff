import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createTradeSearchRequest,
  mapGGGSearchResponseDataToGGGListingSearch,
  searchListings,
} from "./search-listings.ts";
import type { GggContext } from "./types.ts";

const TRADE_API_URL = "https://api.example.test/trade";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): GggContext => ({
  limiter: {
    acquire: async () => {},
    explainWait: () => undefined,
    setRules: () => {},
    observe: () => {},
    penalize: () => {},
  },
  tradeApiUrl: TRADE_API_URL,
  currencyApiUrl: "https://cdn.example.test/currency-exchange",
  userAgent: "poe-stuff-test/1.0 (contact: nobody@example.test)",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(
        JSON.stringify({
          id: "search-1",
          complexity: 7,
          total: 4321,
          result: ["hash-a", "hash-b"],
        }),
        { status: 200 },
      ),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("createTradeSearchRequest", () => {
  it("percent-encodes a league name that has a space in it", () => {
    const request = createTradeSearchRequest({}, "Hardcore Settlers", TRADE_API_URL);

    expect(request.url).toBe(`${TRADE_API_URL}/search/Hardcore%20Settlers`);
  });

  it("sends the query as a JSON body on a POST", () => {
    const request = createTradeSearchRequest(
      { query: { name: "Headhunter" } },
      "Settlers",
      TRADE_API_URL,
    );

    expect(request.init.method).toBe("POST");
    expect(request.init.body).toBe('{"query":{"name":"Headhunter"}}');
  });
});

describe("mapGGGSearchResponseDataToGGGListingSearch", () => {
  it("renames GGG's id, result and total to the words the rest of the repo reads", () => {
    const search = mapGGGSearchResponseDataToGGGListingSearch({
      id: "search-1",
      complexity: 7,
      total: 4321,
      result: ["hash-a"],
    });

    expect(search).toEqual({
      searchId: "search-1",
      hashes: ["hash-a"],
      matchCount: 4321,
      complexity: 7,
    });
  });
});

describe("searchListings", () => {
  it("hands back the search id and hashes after posting the query", async () => {
    const search = await searchListings({ query: {} }, "Settlers", context());

    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(search.searchId).toBe("search-1");
    expect(search.hashes).toEqual(["hash-a", "hash-b"]);
  });
});
