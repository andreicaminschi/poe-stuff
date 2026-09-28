import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { createFetchPageRequest, fetchAllListings, fetchListings, pageHashes } from "./fetch-listings.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

const hashes = (n: number) => Array.from({ length: n }, (_, i) => `h${i}`);

afterEach(() => {
  jest.restoreAllMocks();
});

describe("createFetchPageRequest", () => {
  it("joins the hashes with commas and escapes a search id holding a space and an ampersand", () => {
    const request = createFetchPageRequest(["a", "b"], "x y&z", "https://t/api");

    expect(request).toEqual({ url: "https://t/api/fetch/a,b?query=x%20y%26z" });
  }); // an unescaped & would split the query
});

describe("pageHashes", () => {
  it("splits twenty-one hashes into pages of ten, ten and one", () => {
    const pages = pageHashes(hashes(21));

    expect(pages.map((p) => p.length)).toEqual([10, 10, 1]);
  }); // GGG answers eleven with a 400

  it("makes exactly one page from exactly ten hashes", () => {
    const pages = pageHashes(hashes(10));

    expect(pages).toHaveLength(1);
  }); // at the edge, no empty second page

  it("makes a second page for the eleventh hash", () => {
    const pages = pageHashes(hashes(11));

    expect(pages.map((p) => p.length)).toEqual([10, 1]);
  }); // one past the edge

  it("makes no pages from no hashes", () => {
    const pages = pageHashes([]);

    expect(pages).toEqual([]);
  }); // degenerate input

  it("keeps only the first twenty of thirty-five hashes when limited to two pages", () => {
    const pages = pageHashes(hashes(35), 2);

    expect(pages.flat()).toEqual(hashes(20));
  }); // sliced before paging

  it("refuses a page limit of zero", () => {
    const page = () => pageHashes(hashes(5), 0);

    expect(page).toThrow(RangeError);
  }); // zero would silently fetch nothing

  it("refuses a page limit that is not a number", () => {
    const page = () => pageHashes(hashes(5), NaN);

    expect(page).toThrow(RangeError);
  }); // !(NaN > 0) catches it
});

describe("fetchListings", () => {
  it("hands back the page's listings tagged with the search and page number it was asked for", async () => {
    const fetchMock = stubFetch({ result: [{ id: "a" }] });

    const page = await fetchListings(["a"], "S1", 3, context);

    expect(page).toEqual({ searchId: "S1", page: 3, listings: [{ id: "a" }] });
    expect(fetchMock.mock.calls[0]![0]).toBe("https://trade.test/api/fetch/a?query=S1");
  }); // page number is the caller's, not GGG's
});

describe("fetchAllListings", () => {
  it("fetches fifteen hashes as two pages numbered from zero", async () => {
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
  }); // ten then five

  it("does not ask for the second page until the first has answered", async () => {
    let answerFirst!: () => void;
    const fetchMock = jest.fn<typeof fetch>();
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (answerFirst = () => resolve(new Response(JSON.stringify({ result: [] }))))),
    );
    fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ result: [] })));
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);

    const pending = fetchAllListings(hashes(15), "S", context);
    await new Promise((done) => setImmediate(done));
    const whileFirstOpen = fetchMock.mock.calls.length;
    answerFirst();
    await pending;

    expect(whileFirstOpen).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // sequential on purpose: one shared limiter

  it("fetches nothing for no hashes", async () => {
    const fetchMock = stubFetch();

    const pages = await fetchAllListings([], "S", context);

    expect(pages).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  }); // zero pages, zero requests
});
