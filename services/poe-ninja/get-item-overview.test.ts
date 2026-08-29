import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getItemOverview } from "./get-item-overview.ts";
import type { PoeNinjaContext } from "./types.ts";

const BASE_URL = "https://ninja.example.test";
const PATH = "poe1/api/economy/stash/current/item/overview";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): PoeNinjaContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ lines: [{ id: 1 }] }), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getItemOverview", () => {
  it("treats a response with no lines at all as an empty market rather than a failure", async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    );

    const lines = await getItemOverview("Settlers", "UniqueArmour", context());

    expect(lines).toEqual([]);
  });

  it("asks for one league and one type, and nothing else", async () => {
    await getItemOverview("Settlers", "UniqueArmour", context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/${PATH}?league=Settlers&type=UniqueArmour`,
    );
  });
});
