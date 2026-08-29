import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { createPoeNinjaService } from "./service.ts";
import type { CachedResponse, ResponseCache } from "./types.ts";

const BASE_URL = "https://ninja.example.test";

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

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(JSON.stringify([]), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("createPoeNinjaService", () => {
  it("strips a trailing slash off the base url, so no request ends up with a double slash", async () => {
    await createPoeNinjaService({ baseUrl: `${BASE_URL}/` }).getLeagues();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/poe1/api/economy/leagues`,
    );
  });

  it("hands the cache it was built with down to every endpoint", async () => {
    const ninja = createPoeNinjaService({
      baseUrl: BASE_URL,
      cache: fakeCache(),
    });

    await ninja.getLeagues();
    await ninja.getLeagues();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
