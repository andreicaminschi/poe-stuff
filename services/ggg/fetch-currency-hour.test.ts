import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { fetchCurrencyHour } from "./fetch-currency-hour.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

const digest = {
  next_change_id: 1790000000,
  markets: [{ league: "Allflame" }, { league: "Standard" }, { league: "Allflame" }],
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchCurrencyHour", () => {
  it("asks the CDN for the hour by its id", async () => {
    const fetchMock = stubFetch(digest);

    await fetchCurrencyHour(1788292800, context);

    expect(fetchMock.mock.calls[0]![0]).toBe("https://cdn.test/cx/1788292800");
  }); // hour id is a path segment

  it("hands back every league's markets when no league is named", async () => {
    stubFetch(digest);

    const hour = await fetchCurrencyHour(1, context);

    expect(hour).toEqual(digest);
  }); // untouched digest

  it("keeps only Allflame's two markets and leaves the next id as it came", async () => {
    stubFetch(digest);

    const hour = await fetchCurrencyHour(1, context, { league: "Allflame" });

    expect(hour).toEqual({
      next_change_id: 1790000000,
      markets: [{ league: "Allflame" }, { league: "Allflame" }],
    });
  }); // a backfill still walks from next_change_id

  it("hands back no markets for a league the hour does not carry", async () => {
    stubFetch(digest);

    const hour = await fetchCurrencyHour(1, context, { league: "Nope" });

    expect(hour.markets).toEqual([]);
  }); // filtered to empty, not an error
});
