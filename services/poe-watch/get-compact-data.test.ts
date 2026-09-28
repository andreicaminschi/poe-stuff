import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { getCompactData } from "./get-compact-data.ts";

const context = { baseUrl: "https://pw.test", userAgent: "u" };

let fetchMock: jest.Mock<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn<typeof fetch>();
  globalThis.fetch = fetchMock;
});

const answer = (body: unknown) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));

describe("getCompactData", () => {
  it("asks for every item, bases included, in an encoded league", async () => {
    answer({ items: [] });

    await getCompactData("Hardcore Allflame", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pw.test/compact?league=Hardcore%20Allflame&all=true");
  });

  it("returns the items out of the envelope", async () => {
    answer({ items: [{ id: 1 }], extra: true });

    expect(await getCompactData("X", context)).toEqual([{ id: 1 }]);
  });

  it("returns an empty list when the envelope has no items", async () => {
    answer({});

    expect(await getCompactData("X", context)).toEqual([]);
  });
});
