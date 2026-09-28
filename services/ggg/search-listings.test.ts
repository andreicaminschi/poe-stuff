import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { searchListings } from "./search-listings.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("searchListings", () => {
  it("posts the query as JSON to the search address of a league whose name has a space", async () => {
    const fetchMock = stubFetch({ id: "S", result: [], total: 0, complexity: 1 });

    await searchListings({ query: { type: "Ring" } }, "Hardcore Allflame", context);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://trade.test/api/search/Hardcore%20Allflame");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe("{\"query\":{\"type\":\"Ring\"}}");
    expect(init?.headers).toMatchObject({ "content-type": "application/json" });
  }); // league is a path segment, escaped

  it("reports 812 matches even when only two hashes came back", async () => {
    stubFetch({ id: "S", result: ["a", "b"], total: 812, complexity: 7 });

    const search = await searchListings({}, "L", context);

    expect(search).toEqual({ searchId: "S", hashes: ["a", "b"], matchCount: 812, complexity: 7 });
  }); // GGG caps hashes, not the total
});
