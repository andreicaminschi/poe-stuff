import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getCorruptionData } from "./get-corruption-data.ts";

const context = { baseUrl: "https://pw.test", userAgent: "u" };

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const answer = (body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));

describe("getCorruptionData", () => {
  it("asks for every item's corruptions in an encoded league", async () => {
    answer([]);

    await getCorruptionData("A&B", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pw.test/corruptions?league=A%26B&all=true");
  });

  it("returns the bare array unchanged", async () => {
    answer([{ id: 7 }]);

    expect(await getCorruptionData("X", context)).toEqual([{ id: 7 }]);
  });
});
