import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { fetchJson } from "./call.ts";
import { PoeNinjaHttpError } from "./errors.ts";
import type { CachedResponse, PoeNinjaContext, ResponseCache } from "./types.ts";

const BASE_URL = "https://ninja.example.test";
const PATH = "poe1/api/economy/stash/current/item/overview";
const HOUR_MS = 3_600_000;
const RETRY_DELAY_MS = 2_000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

/** Really stores, so a second call can be answered from what the first one wrote. */
function fakeCache(): ResponseCache {
  const stored = new Map<string, CachedResponse>();

  return {
    get: async (key) => stored.get(key),
    set: async (key, value) => {
      stored.set(key, value);
    },
  };
}

const context = (cache?: ResponseCache): PoeNinjaContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
  ...(cache === undefined ? {} : { cache }),
});

const answered = () =>
  new Response(JSON.stringify({ lines: [{ id: 1 }] }), { status: 200 });

const rejected = (status: number) => new Response("", { status });

const requestedUrl = (attempt: number) =>
  String(fetchMock.mock.calls[attempt]?.[0]);

/** Runs a call that is expected to fail out to its last attempt. */
async function failureOf(pending: Promise<unknown>): Promise<unknown> {
  const settled = pending.then(
    (value): unknown => value,
    (error: unknown): unknown => error,
  );

  await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);
  return settled;
}

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(async () => answered());
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("fetchJson", () => {
  it("sorts the query, so two callers spelling one request in different orders share an answer", async () => {
    await fetchJson(PATH, { type: "Currency", league: "Settlers" }, context());
    await fetchJson(PATH, { league: "Settlers", type: "Currency" }, context());

    expect(requestedUrl(0)).toBe(
      `${BASE_URL}/${PATH}?league=Settlers&type=Currency`,
    );
    expect(requestedUrl(1)).toBe(requestedUrl(0));
  });

  it("leaves the question mark off a request that carries no query at all", async () => {
    await fetchJson("poe1/api/economy/leagues", {}, context());

    expect(requestedUrl(0)).toBe(`${BASE_URL}/poe1/api/economy/leagues`);
  });

  it("encodes a league name with a space the way a form does, as a plus", async () => {
    await fetchJson(PATH, { league: "Hardcore Settlers" }, context());

    expect(requestedUrl(0)).toBe(`${BASE_URL}/${PATH}?league=Hardcore+Settlers`);
  });

  it("asks a second time two seconds after a rejection for going too fast", async () => {
    fetchMock.mockImplementationOnce(async () => rejected(429));

    const pending = fetchJson(PATH, {}, context());
    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS - 1);
    const beforeTheDelayWasUp = fetchMock.mock.calls.length;

    await jest.advanceTimersByTimeAsync(1);
    await pending;

    expect(beforeTheDelayWasUp).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks a second time after the server has a bad moment", async () => {
    fetchMock.mockImplementationOnce(async () => rejected(503));

    const pending = fetchJson(PATH, {}, context());
    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up on a page that does not exist without asking again", async () => {
    fetchMock.mockImplementation(async () => rejected(404));

    const failure = await failureOf(fetchJson(PATH, {}, context()));

    expect(failure).toBeInstanceOf(PoeNinjaHttpError);
    expect((failure as PoeNinjaHttpError).attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says the request was asked twice when the second answer failed too", async () => {
    fetchMock.mockImplementation(async () => rejected(429));

    const failure = await failureOf(fetchJson(PATH, {}, context()));

    expect((failure as PoeNinjaHttpError).attempts).toBe(2);
    expect((failure as PoeNinjaHttpError).message).toContain("2 attempts");
  });

  it("stores the body the second attempt finally produced", async () => {
    const cache = fakeCache();
    fetchMock.mockImplementationOnce(async () => rejected(429));

    const pending = fetchJson(PATH, {}, context(cache));
    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await pending;
    const body = await fetchJson(PATH, {}, context(cache));

    expect(body).toEqual({ lines: [{ id: 1 }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("answers from the cache without making a request", async () => {
    const cache = fakeCache();
    await fetchJson(PATH, {}, context(cache));
    fetchMock.mockClear();

    const body = await fetchJson(PATH, {}, context(cache));

    expect(body).toEqual({ lines: [{ id: 1 }] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keys by the hour, so last hour's answer is never read back", async () => {
    const cache = fakeCache();
    await fetchJson(PATH, {}, context(cache));

    await jest.advanceTimersByTimeAsync(HOUR_MS);
    await fetchJson(PATH, {}, context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
