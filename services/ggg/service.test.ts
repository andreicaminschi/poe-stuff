import { afterEach, beforeEach, describe, it, expect, jest } from "@jest/globals";
import { createGGGService } from "./service.ts";
import { stubFetch, UA } from "./endpoints.test-helpers.ts";

beforeEach(() => {
  jest.useFakeTimers({ now: 1_000_000 });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("createGGGService", () => {
  it("talks to the live trade API when no url is given", async () => {
    const fetchMock = stubFetch({ result: [] });

    await createGGGService({ userAgent: UA }).getStats();

    expect(fetchMock.mock.calls[0]![0]).toBe("https://www.pathofexile.com/api/trade/data/stats");
  });

  it("talks to the PoE1 currency CDN when no url is given", async () => {
    const fetchMock = stubFetch({ markets: [] });

    await createGGGService({ userAgent: UA }).fetchCurrencyHour(5);

    expect(fetchMock.mock.calls[0]![0]).toBe("https://web.poecdn.com/api/currency-exchange/5");
  });

  it("trims a trailing slash off the urls it is given", async () => {
    const fetchMock = stubFetch({ result: [] }, { markets: [] });
    const service = createGGGService({
      userAgent: UA,
      tradeApiUrl: "https://t.test/api/",
      currencyApiUrl: "https://c.test/cx/",
    });

    await service.getStats();
    await jest.advanceTimersByTimeAsync(1_000);
    await service.fetchCurrencyHour(1);

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["https://t.test/api/data/stats", "https://c.test/cx/1"]);
  });

  it("opens at one request per second before the server names its limits", async () => {
    const fetchMock = stubFetch({ result: [] }, { result: [] });
    const service = createGGGService({ userAgent: UA });

    void service.getStats();
    void service.getStats();
    await jest.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("paces every endpoint on the one budget", async () => {
    const fetchMock = stubFetch({ result: [] }, { markets: [] });
    const service = createGGGService({ userAgent: UA });

    void service.getItemData();
    void service.fetchCurrencyHour(1);
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives two services two separate budgets", async () => {
    const fetchMock = stubFetch({ result: [] }, { result: [] });

    void createGGGService({ userAgent: UA }).getStats();
    void createGGGService({ userAgent: UA }).getStats();
    await jest.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports events to the handler it was given", async () => {
    stubFetch({ result: [] });
    const types: string[] = [];

    await createGGGService({ userAgent: UA, onEvent: (e) => types.push(e.type) }).getStats();

    expect(types).toContain("request");
  });
});
