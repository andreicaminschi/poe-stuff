import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getCompactData } from "./get-compact-data.ts";
import type { PoeWatchContext } from "./types.ts";

const BASE_URL = "https://api.example.test";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const context = (): PoeWatchContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

const requestedUrl = () => String(fetchMock.mock.calls[0]?.[0]);

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ items: [{ id: 1, name: "Chaos Orb" }] }), {
        status: 200,
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getCompactData", () => {
  it("asks for every item, without which the answer carries no crafting bases at all", async () => {
    await getCompactData("Settlers", context());

    expect(requestedUrl()).toContain("all=true");
  });

  it("percent-encodes a league name that has a space in it", async () => {
    await getCompactData("Hardcore Settlers", context());

    expect(requestedUrl()).toBe(
      `${BASE_URL}/compact?league=Hardcore%20Settlers&all=true`,
    );
  });

  it("hands back the items inside the envelope, not the envelope", async () => {
    const items = await getCompactData("Settlers", context());

    expect(items).toEqual([{ id: 1, name: "Chaos Orb" }]);
  });
});
