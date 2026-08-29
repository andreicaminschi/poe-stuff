import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { createGGGService } from "./service.ts";
import type { GGGServiceOptions } from "./service.ts";

const TRADE_API_URL = "https://api.example.test/trade";
const CURRENCY_API_URL = "https://cdn.example.test/currency-exchange";
const FORUM_URL = "https://www.example.test/forum";
const USER_AGENT = "poe-stuff-test/1.0 (contact: nobody@example.test)";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

/** When each request actually went out, on the fake clock. */
let sentAt: number[] = [];

/**
 * One body every endpoint here can read: a stats envelope, a currency digest, and a page
 * of text all at once. No rate-limit headers, so the opening rules stay in force.
 */
const answer = () =>
  new Response(
    JSON.stringify({ result: [], next_change_id: 0, markets: [] }),
    { status: 200 },
  );

const service = (options: Omit<GGGServiceOptions, "userAgent"> = {}) =>
  createGGGService({
    userAgent: USER_AGENT,
    tradeApiUrl: TRADE_API_URL,
    currencyApiUrl: CURRENCY_API_URL,
    forumUrl: FORUM_URL,
    ...options,
  });

const headersSentOn = (attempt: number) =>
  (fetchMock.mock.calls[attempt]?.[1]?.headers ?? {}) as Record<string, string>;

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  sentAt = [];
  fetchMock = jest.fn<FetchLike>(async () => {
    sentAt.push(Date.now());
    return answer();
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("createGGGService", () => {
  it("lets only one request a second through until GGG's headers say otherwise", async () => {
    const ggg = service();

    const pending = Promise.all([ggg.getStats(), ggg.getStats()]);
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;

    expect(sentAt).toEqual([0, 1_000]);
  });

  it("paces the trade, currency and forum endpoints against one shared budget", async () => {
    const ggg = service();

    const pending = Promise.all([
      ggg.getStats(),
      ggg.fetchCurrencyHour(480_000),
      ggg.getNewsPage(1),
    ]);
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;

    expect(sentAt).toEqual([0, 1_000, 2_000]);
  });

  it("adopts the request budget the caller handed it instead of the opening one", async () => {
    const ggg = service({ rules: [{ max: 2, windowMs: 1_000 }] });

    const pending = Promise.all([
      ggg.getStats(),
      ggg.getStats(),
      ggg.getStats(),
    ]);
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;

    expect(sentAt).toEqual([0, 0, 1_000]);
  });

  it("strips a trailing slash off each base, so no URL ends up with a double slash", async () => {
    const ggg = service({
      tradeApiUrl: `${TRADE_API_URL}/`,
      forumUrl: `${FORUM_URL}/`,
    });

    await ggg.getStats();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${TRADE_API_URL}/data/stats`);
    expect(ggg.forumThreadUrl(1)).toBe(`${FORUM_URL}/view-thread/1`);
  });

  it("sends the user agent it was built with on every endpoint", async () => {
    const ggg = service();

    const pending = Promise.all([ggg.getStats(), ggg.getNewsPage(1)]);
    await jest.advanceTimersByTimeAsync(5_000);
    await pending;

    expect(headersSentOn(0)["user-agent"]).toBe(USER_AGENT);
    expect(headersSentOn(1)["user-agent"]).toBe(USER_AGENT);
  });

  it("builds a thread URL off the forum base rather than the trade base", () => {
    expect(service().forumThreadUrl(3_600_123)).toBe(
      `${FORUM_URL}/view-thread/3600123`,
    );
  });
});
