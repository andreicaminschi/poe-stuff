import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { getBaseItems } from "./get-base-items.ts";
import type { RepoeContext } from "./types.ts";

const BASE_URL = "https://repoe.example.test";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

const export_ = {
  "Metadata/Items/Currency/CurrencyRerollRare": {
    name: "Chaos Orb",
    item_class: "StackableCurrency",
  },
};

const context = (): RepoeContext => ({
  baseUrl: BASE_URL,
  userAgent: "poe-stuff-test/1.0",
});

beforeEach(() => {
  fetchMock = jest.fn<FetchLike>(
    async () => new Response(JSON.stringify(export_), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe("getBaseItems", () => {
  it("asks for the whole export in one file, since there is no way to ask for less", async () => {
    await getBaseItems(context());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/base_items.json`);
  });

  it("hands back the file itself, keyed by metadata id, with no envelope around it", async () => {
    const bases = await getBaseItems(context());

    expect(bases["Metadata/Items/Currency/CurrencyRerollRare"]?.name).toBe(
      "Chaos Orb",
    );
  });
});
