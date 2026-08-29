import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  createFetchPageRequest,
  fetchAllListings,
  fetchListings,
  pageHashes,
} from "./fetch-listings.ts";
import type { GggContext } from "./types.ts";

const TRADE_API_URL = "https://api.example.test/trade";
const USER_AGENT = "poe-stuff-test/1.0 (contact: nobody@example.test)";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

/** `hash-0` … `hash-n`, so a page can be read back to the position it was cut from. */
const someHashes = (count: number): string[] =>
  Array.from({ length: count }, (_, at) => `hash-${at}`);

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
  forumUrl: "https://www.example.test/forum",
  userAgent: USER_AGENT,
});

const answered = (listings: unknown[] = []) =>
  new Response(JSON.stringify({ result: listings }), { status: 200 });

const urlOf = (attempt: number) => String(fetchMock.mock.calls[attempt]?.[0]);

/** One turn of the microtask queue, for asserting what has and has not started yet. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(async () => answered());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("pageHashes", () => {
  it("gives back no pages when the search matched no hashes", () => {
    expect(pageHashes([])).toEqual([]);
  });

  it("packs ten hashes into a single page", () => {
    const pages = pageHashes(someHashes(10));

    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(10);
  });

  it("puts the eleventh hash on a second page of its own", () => {
    const pages = pageHashes(someHashes(11));

    expect(pages).toHaveLength(2);
    expect(pages[1]).toEqual(["hash-10"]);
  });

  it("takes only the first ten hashes when the caller allows one page", () => {
    const pages = pageHashes(someHashes(25), 1);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.at(-1)).toBe("hash-9");
  });

  it("asks for nothing when the caller allows zero pages", () => {
    expect(pageHashes(someHashes(25), 0)).toEqual([]);
  });

  it("returns every hash when the caller allows more pages than exist", () => {
    const pages = pageHashes(someHashes(12), 5);

    expect(pages).toHaveLength(2);
    expect(pages.flat()).toHaveLength(12);
  });
});

describe("createFetchPageRequest", () => {
  it("lists the hashes comma-separated in the path", () => {
    const request = createFetchPageRequest(["a", "b", "c"], "abc", TRADE_API_URL);

    expect(request.url).toContain(`${TRADE_API_URL}/fetch/a,b,c?`);
  });

  it("percent-encodes the search id into the query", () => {
    const request = createFetchPageRequest(["a"], "one two", TRADE_API_URL);

    expect(request.url).toContain("?query=one%20two");
  });
});

describe("fetchListings", () => {
  it("labels the listings with the search and page the caller asked for", async () => {
    const page = await fetchListings(["a"], "search-1", 3, context());

    expect(page.searchId).toBe("search-1");
    expect(page.page).toBe(3);
  });

  it("hands back the listings inside the envelope, not the envelope", async () => {
    fetchMock.mockImplementation(async () => answered([{ id: "listing-1" }]));

    const page = await fetchListings(["a"], "search-1", 0, context());

    expect(page.listings).toEqual([{ id: "listing-1" }]);
  });
});

describe("fetchAllListings", () => {
  it("numbers the pages from zero in the order the hashes were cut", async () => {
    const pages = await fetchAllListings(someHashes(25), "search-1", context());

    expect(pages.map((page) => page.page)).toEqual([0, 1, 2]);
    expect(urlOf(0)).toContain("/fetch/hash-0,");
    expect(urlOf(2)).toContain("/fetch/hash-20,");
  });

  it("waits for one page to come back before asking for the next", async () => {
    const order: string[] = [];
    let at = 0;
    fetchMock.mockImplementation(async () => {
      const which = at;
      at += 1;
      order.push(`asked for page ${which}`);
      await tick();
      order.push(`page ${which} came back`);
      return answered();
    });

    await fetchAllListings(someHashes(20), "search-1", context());

    expect(order).toEqual([
      "asked for page 0",
      "page 0 came back",
      "asked for page 1",
      "page 1 came back",
    ]);
  });

  it("makes no request at all for a search that matched nothing", async () => {
    const pages = await fetchAllListings([], "search-1", context());

    expect(pages).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops after the number of pages the caller allowed", async () => {
    const pages = await fetchAllListings(someHashes(25), "search-1", context(), 2);

    expect(pages).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
