import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getLeagues } from "./get-leagues.ts";
import type { PoeNinjaContext } from "./types.ts";

const BASE_URL = "https://ninja.example.test";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): PoeNinjaContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(
        JSON.stringify([{ id: "Settlers", name: "Settlers of Kalguur" }]),
        { status: 200 },
      ),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getLeagues", () => {
  it("asks the leagues path with no query on it, and hands back the bare array", async () => {
    const leagues = await getLeagues(context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/poe1/api/economy/leagues`,
    );
    expect(leagues).toEqual([{ id: "Settlers", name: "Settlers of Kalguur" }]);
  });
});
