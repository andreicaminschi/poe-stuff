import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createRepoeService } from "./service.ts";
import type { CachedResponse, ResponseCache } from "./types.ts";

const BASE_URL = "https://repoe.example.test";

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
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(JSON.stringify({}), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("createRepoeService", () => {
  it("strips a trailing slash off the base url, so no request ends up with a double slash", async () => {
    await createRepoeService({ baseUrl: `${BASE_URL}/` }).getBaseItems();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/base_items.json`);
  });

  it("hands the cache it was built with down to the endpoint", async () => {
    const repoe = createRepoeService({ baseUrl: BASE_URL, cache: fakeCache() });

    await repoe.getBaseItems();
    await repoe.getBaseItems();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
