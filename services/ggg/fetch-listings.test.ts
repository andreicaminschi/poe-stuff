import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { createFetchPageRequest, fetchAllListings, fetchListings, pageHashes } from "./fetch-listings.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

const hashes = (n: number) => Array.from({ length: n }, (_, i) => `h${i}`);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("createFetchPageRequest", () => {
  it("joins the hashes with commas and escapes the search id", () => {
    expect(createFetchPageRequest(["a", "b"], "x y&z", "https://t/api")).toEqual({
      url: "https://t/api/fetch/a,b?query=x%20y%26z",
    });
  });
});

describe("pageHashes", () => {
  it("splits into pages of ten", () => {
    expect(pageHashes(hashes(21)).map((p) => p.length)).toEqual([10, 10, 1]);
  });

  it("makes exactly one page from exactly ten hashes", () => {
    expect(pageHashes(hashes(10))).toHaveLength(1);
  });

  it("makes no pages from no hashes", () => {
    expect(pageHashes([])).toEqual([]);
  });

  it("stops after the page limit", () => {
    expect(pageHashes(hashes(35), 2).flat()).toEqual(hashes(20));
  });

  it("throws when the limit is not positive", () => {
    expect(() => pageHashes(hashes(5), 0)).toThrow(RangeError);
  });
});

describe("fetchListings", () => {
  it("answers the page's listings tagged with the search and page number", async () => {
    const fetchMock = stubFetch({ result: [{ id: "a" }] });

    const page = await fetchListings(["a"], "S1", 3, context);

    expect(page).toEqual({ searchId: "S1", page: 3, listings: [{ id: "a" }] });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://trade.test/api/fetch/a?query=S1");
  });
});

describe("fetchAllListings", () => {
  it("fetches one page after another, numbered from zero", async () => {
    const fetchMock = stubFetch({ result: [1] }, { result: [2] });

    const pages = await fetchAllListings(hashes(15), "S", context);

    expect(pages.map((p) => [p.page, p.listings])).toEqual([
      [0, [1]],
      [1, [2]],
    ]);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      `https://trade.test/api/fetch/${hashes(10).join(",")}?query=S`,
      "https://trade.test/api/fetch/h10,h11,h12,h13,h14?query=S",
    ]);
  });

  it("fetches nothing for no hashes", async () => {
    const fetchMock = stubFetch();

    expect(await fetchAllListings([], "S", context)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
