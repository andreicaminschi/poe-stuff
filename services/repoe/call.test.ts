import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { call, currentHour } from "./call.ts";
import { RepoeHttpError } from "./errors.ts";
import type { CachedResponse, RepoeContext, ResponseCache } from "./types.ts";

const BASE_URL = "https://repoe.example.test";
const URL_ONE = `${BASE_URL}/base_items.json`;
const URL_TWO = `${BASE_URL}/mods.json`;
const THIS_HOUR = "480000";
const NEXT_HOUR = "480001";
const HOUR_MS = 3_600_000;

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

const context = (cache?: ResponseCache): RepoeContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
  ...(cache === undefined ? {} : { cache }),
});

const rejected = (status: number) => new Response("", { status });

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ "Metadata/Items/Belt": { name: "Belt" } }), {
        status: 200,
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("call", () => {
  it("hands back the decoded body", async () => {
    const body = await call(URL_ONE, THIS_HOUR, context());

    expect(body).toEqual({ "Metadata/Items/Belt": { name: "Belt" } });
  });

  it("fails naming the status RePoE answered with", async () => {
    fetchMock.mockImplementation(async () => rejected(404));

    const failure = await call(URL_ONE, THIS_HOUR, context()).catch(
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(RepoeHttpError);
    expect((failure as RepoeHttpError).status).toBe(404);
  });

  it("makes no second attempt after a failure", async () => {
    fetchMock.mockImplementation(async () => rejected(503));

    await call(URL_ONE, THIS_HOUR, context()).catch(() => undefined);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers from the cache without making a request", async () => {
    const cache = fakeCache();
    await call(URL_ONE, THIS_HOUR, context(cache));
    fetchMock.mockClear();

    const body = await call(URL_ONE, THIS_HOUR, context(cache));

    expect(body).toEqual({ "Metadata/Items/Belt": { name: "Belt" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a successful answer under a key built from the url and the salt", async () => {
    const cache = fakeCache();
    await call(URL_ONE, THIS_HOUR, context(cache));

    await call(URL_TWO, THIS_HOUR, context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keys two salts apart, so last hour's answer is never read back this hour", async () => {
    const cache = fakeCache();
    await call(URL_ONE, THIS_HOUR, context(cache));

    await call(URL_ONE, NEXT_HOUR, context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stores nothing when the request failed", async () => {
    const cache = fakeCache();
    fetchMock.mockImplementationOnce(async () => rejected(503));

    await call(URL_ONE, THIS_HOUR, context(cache)).catch(() => undefined);
    await call(URL_ONE, THIS_HOUR, context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("makes a request every time when no cache was handed over", async () => {
    await call(URL_ONE, THIS_HOUR, context());
    await call(URL_ONE, THIS_HOUR, context());

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("currentHour", () => {
  it("names a different hour the moment the clock passes the hour mark", () => {
    jest.setSystemTime(HOUR_MS - 1);
    const before = currentHour();

    jest.setSystemTime(HOUR_MS);

    expect(before).toBe("0");
    expect(currentHour()).toBe("1");
  });
});
