import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getExchangeOverview } from "./get-exchange-overview.ts";
import type { PoeNinjaContext } from "./types.ts";

const BASE_URL = "https://ninja.example.test";
const PATH = "poe1/api/economy/exchange/current/overview";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const book = {
  core: { primary: "chaos", secondary: "divine", rates: { divine: 0.004899 } },
  lines: [{ id: "accelerating-catalyst", primaryValue: 12 }],
  items: [{ id: "accelerating-catalyst", name: "Accelerating Catalyst" }],
};

const context = (): PoeNinjaContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(JSON.stringify(book), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getExchangeOverview", () => {
  it("hands back the whole book, because the prices alone cannot name what they price", async () => {
    const answer = await getExchangeOverview("Settlers", "Currency", context());

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/${PATH}?league=Settlers&type=Currency`,
    );
    expect(answer.items[0]?.name).toBe("Accelerating Catalyst");
    expect(answer.core.primary).toBe("chaos");
  });
});
