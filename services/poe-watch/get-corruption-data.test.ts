import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getCorruptionData } from "./get-corruption-data.ts";
import type { PoeWatchContext } from "./types.ts";

const BASE_URL = "https://api.example.test";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): PoeWatchContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify([{ id: 1, corruptions: [] }]), {
        status: 200,
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getCorruptionData", () => {
  it("hands back the bare array this endpoint answers with, which has no envelope", async () => {
    const outcomes = await getCorruptionData("Settlers", context());

    expect(outcomes).toEqual([{ id: 1, corruptions: [] }]);
  });

  it("asks for every item's outcomes, not only the ones with current data", async () => {
    await getCorruptionData("Hardcore Settlers", context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/corruptions?league=Hardcore%20Settlers&all=true`,
    );
  });
});
