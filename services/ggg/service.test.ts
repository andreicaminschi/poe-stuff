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
  describe("where it sends requests", () => {
    it("talks to the live trade API when no address is given", async () => {
      const fetchMock = stubFetch({ result: [] });

      await createGGGService({ userAgent: UA }).getStats();

      expect(fetchMock.mock.calls[0]![0]).toBe("https://www.pathofexile.com/api/trade/data/stats");
    }); // default trade base

    it("talks to the PoE1 currency CDN when no address is given", async () => {
      const fetchMock = stubFetch({ markets: [] });

      await createGGGService({ userAgent: UA }).fetchCurrencyHour(5);

      expect(fetchMock.mock.calls[0]![0]).toBe("https://web.poecdn.com/api/currency-exchange/5");
    }); // realm is part of the default

    it("trims a trailing slash off both addresses it is given", async () => {
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
    }); // trimmed once at construction
  });

  describe("pacing", () => {
    it("opens at one request per second before the server names its limits", async () => {
      const fetchMock = stubFetch({ result: [] }, { result: [] });
      const service = createGGGService({ userAgent: UA });

      void service.getStats();
      void service.getStats();
      await jest.advanceTimersByTimeAsync(999);
      const at999 = fetchMock.mock.calls.length;
      await jest.advanceTimersByTimeAsync(1);

      expect(at999).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }); // second waits the full second

    it("paces the item list and the currency hour on one shared budget", async () => {
      const fetchMock = stubFetch({ result: [] }, { markets: [] });
      const service = createGGGService({ userAgent: UA });

      void service.getItemData();
      void service.fetchCurrencyHour(1);
      await jest.advanceTimersByTimeAsync(0);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    }); // one service, one limiter

    it("gives two services two separate budgets", async () => {
      const fetchMock = stubFetch({ result: [] }, { result: [] });

      void createGGGService({ userAgent: UA }).getStats();
      void createGGGService({ userAgent: UA }).getStats();
      await jest.advanceTimersByTimeAsync(0);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    }); // why two in one process overspend one IP

    it("paces at the rules it was given instead of the opening one per second", async () => {
      const fetchMock = stubFetch({ result: [] }, { result: [] });
      const service = createGGGService({ userAgent: UA, rules: [{ max: 2, windowMs: 1_000 }] });

      void service.getStats();
      void service.getStats();
      await jest.advanceTimersByTimeAsync(0);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    }); // rules option replaces OPENING_RULES
  });

  it("reports what each call does to the handler it was given", async () => {
    stubFetch({ result: [] });
    const types: string[] = [];

    await createGGGService({ userAgent: UA, onEvent: (e) => types.push(e.type) }).getStats();

    expect(types).toContain("request");
  }); // onEvent reaches every endpoint's context
});
