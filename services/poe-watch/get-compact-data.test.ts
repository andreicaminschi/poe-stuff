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
  it("asks for every item, crafting bases included, in a league whose name has a space", async () => {
    answer({ items: [] });

    await getCompactData("Hardcore Allflame", context);

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://pw.test/compact?league=Hardcore%20Allflame&all=true");
  }); // without all=true no base comes back

  it("hands back the item list and drops the rest of the envelope", async () => {
    answer({ items: [{ id: 1 }], extra: true });

    const items = await getCompactData("X", context);

    expect(items).toEqual([{ id: 1 }]);
  }); // unwraps items

  it("hands back an empty list when the envelope carries no items", async () => {
    answer({});

    const items = await getCompactData("X", context);

    expect(items).toEqual([]);
  }); // ?? [] fallback
});
