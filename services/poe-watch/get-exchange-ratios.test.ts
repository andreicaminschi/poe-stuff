import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getExchangeRatios } from "./get-exchange-ratios.ts";

const context = { baseUrl: "https://pw.test", userAgent: "u" };

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const answer = (body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));

describe("getExchangeRatios", () => {
  it("names both the league and the game in the request", async () => {
    answer({ items: [] });

    await getExchangeRatios("Dawn of the Hunt", "poe2", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://pw.test/exchange/ratios?league=Dawn%20of%20the%20Hunt&game=poe2",
    );
  }); // league names collide across games

  it("hands back the item list out of the envelope", async () => {
    answer({ items: [{ id: 3 }] });

    const items = await getExchangeRatios("X", "poe1", context);

    expect(items).toEqual([{ id: 3 }]);
  }); // unwraps items

  it("hands back an empty list when the envelope carries no items", async () => {
    answer({});

    const items = await getExchangeRatios("X", "poe1", context);

    expect(items).toEqual([]);
  }); // ?? [] fallback
});
