import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getExchangeRatios } from "./get-exchange-ratios.ts";
import type { PoeWatchContext } from "./types.ts";

const BASE_URL = "https://api.example.test";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): PoeWatchContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

const requestedUrl = (attempt: number) =>
  String(fetchMock.mock.calls[attempt]?.[0]);

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ items: [{ id: 1, chaos: 1 }] }), {
        status: 200,
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getExchangeRatios", () => {
  it("names the game in the request, so two games' leagues of one name never share an answer", async () => {
    await getExchangeRatios("Standard", "poe1", context());
    await getExchangeRatios("Standard", "poe2", context());

    expect(requestedUrl(0)).toBe(
      `${BASE_URL}/exchange/ratios?league=Standard&game=poe1`,
    );
    expect(requestedUrl(1)).toBe(
      `${BASE_URL}/exchange/ratios?league=Standard&game=poe2`,
    );
  });

  it("hands back the items inside the envelope, not the envelope", async () => {
    const items = await getExchangeRatios("Settlers", "poe1", context());

    expect(items).toEqual([{ id: 1, chaos: 1 }]);
  });
});
