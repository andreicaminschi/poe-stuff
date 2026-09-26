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
  });

  it("answers every league when none is named", async () => {
    stubFetch(digest);

    expect(await fetchCurrencyHour(1, context)).toEqual(digest);
  });

  it("keeps only the named league's markets and the next id untouched", async () => {
    stubFetch(digest);

    const hour = await fetchCurrencyHour(1, context, { league: "Allflame" });

    expect(hour).toEqual({
      next_change_id: 1790000000,
      markets: [{ league: "Allflame" }, { league: "Allflame" }],
    });
  });

  it("answers no markets for a league the hour does not carry", async () => {
    stubFetch(digest);

    expect((await fetchCurrencyHour(1, context, { league: "Nope" })).markets).toEqual([]);
  });
});
