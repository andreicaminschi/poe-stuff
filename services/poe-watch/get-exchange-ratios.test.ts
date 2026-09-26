import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getExchangeRatios } from "./get-exchange-ratios.ts";

const context = { baseUrl: "https://pw.test", userAgent: "u" };

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const answer = (body: unknown) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));

describe("getExchangeRatios", () => {
  it("names the league and the game in the request", async () => {
    answer({ items: [] });

    await getExchangeRatios("Dawn of the Hunt", "poe2", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://pw.test/exchange/ratios?league=Dawn%20of%20the%20Hunt&game=poe2",
    );
  });

  it("returns the items out of the envelope", async () => {
    answer({ items: [{ id: 3 }] });

    expect(await getExchangeRatios("X", "poe1", context)).toEqual([{ id: 3 }]);
  });
});
