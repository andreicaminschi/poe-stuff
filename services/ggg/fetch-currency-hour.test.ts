import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { fetchCurrencyHour } from "./fetch-currency-hour.ts";
import type {
  CurrencyExchange,
  CurrencyMarket,
  GggContext,
} from "./types.ts";

const CURRENCY_API_URL = "https://cdn.example.test/currency-exchange";
const TRADE_API_URL = "https://api.example.test/trade";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const market = (league: string, pair: readonly [string, string]): CurrencyMarket => ({
  league,
  market_id: pair.join("|"),
  market_pair: pair,
  volume_traded: { [pair[0]]: 1, [pair[1]]: 2 },
  lowest_stock: { [pair[0]]: 3, [pair[1]]: 4 },
  highest_stock: { [pair[0]]: 5, [pair[1]]: 6 },
  lowest_ratio: { [pair[0]]: 1, [pair[1]]: 7 },
  highest_ratio: { [pair[0]]: 1, [pair[1]]: 8 },
});

const digest: CurrencyExchange = {
  next_change_id: 1_788_256_800,
  markets: [
    market("Settlers", ["Metadata/Items/Currency/A", "Metadata/Items/Currency/B"]),
    market("Hardcore Settlers", ["Metadata/Items/Currency/A", "Metadata/Items/Currency/C"]),
    market("Settlers", ["Metadata/Items/Currency/B", "Metadata/Items/Currency/C"]),
  ],
};

const context = (): GggContext => ({
  limiter: {
    acquire: async () => {},
    explainWait: () => undefined,
    setRules: () => {},
    observe: () => {},
    penalize: () => {},
  },
  tradeApiUrl: TRADE_API_URL,
  currencyApiUrl: CURRENCY_API_URL,
  userAgent: "poe-stuff-test/1.0 (contact: nobody@example.test)",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(JSON.stringify(digest), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("fetchCurrencyHour", () => {
  it("joins the hour onto the CDN base, which is not where the trade API lives", async () => {
    await fetchCurrencyHour(480_000, context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${CURRENCY_API_URL}/480000`);
  });

  it("hands back every league's markets when the caller names no league", async () => {
    const hour = await fetchCurrencyHour(480_000, context());

    expect(hour.markets).toHaveLength(3);
  });

  it("keeps only the markets of the league the caller named", async () => {
    const hour = await fetchCurrencyHour(480_000, context(), {
      league: "Settlers",
    });

    expect(hour.markets).toEqual([digest.markets[0], digest.markets[2]]);
  });

  it("answers with no markets when the named league traded nothing that hour", async () => {
    const hour = await fetchCurrencyHour(480_000, context(), {
      league: "Ruthless Settlers",
    });

    expect(hour.markets).toEqual([]);
  });

  it("reports the next hour id untouched even when a league was asked for", async () => {
    const hour = await fetchCurrencyHour(480_000, context(), {
      league: "Settlers",
    });

    expect(hour.next_change_id).toBe(1_788_256_800);
  });
});
