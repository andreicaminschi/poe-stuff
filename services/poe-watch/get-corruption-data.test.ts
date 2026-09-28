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
  it("asks for every item's corruptions in a league whose name holds an ampersand", async () => {
    answer([]);

    await getCorruptionData("A&B", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pw.test/corruptions?league=A%26B&all=true");
  }); // an unencoded & would split the query

  it("hands back the bare array unchanged", async () => {
    answer([{ id: 7 }]);

    const outcomes = await getCorruptionData("X", context);

    expect(outcomes).toEqual([{ id: 7 }]);
  }); // no envelope, unlike compact
});
