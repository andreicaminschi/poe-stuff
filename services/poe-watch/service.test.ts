import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createPoeWatchService } from "./service.ts";
import type { CachedResponse, ResponseCache } from "./types.ts";

const BASE_URL = "https://api.example.test";

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
    async () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("createPoeWatchService", () => {
  it("strips a trailing slash off the base url, so no request ends up with a double slash", async () => {
    await createPoeWatchService({ baseUrl: `${BASE_URL}/` }).getCompactData(
      "Settlers",
    );

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/compact?league=Settlers&all=true`,
    );
  });

  it("hands the cache it was built with down to every endpoint", async () => {
    const poeWatch = createPoeWatchService({
      baseUrl: BASE_URL,
      cache: fakeCache(),
    });

    await poeWatch.getCompactData("Settlers");
    await poeWatch.getCompactData("Settlers");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
