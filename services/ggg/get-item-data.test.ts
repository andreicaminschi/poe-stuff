import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  getItemData,
  mapGGGItemDataToGGGItem,
  mapGGGItemGroupDataToGGGItemGroup,
} from "./get-item-data.ts";
import type { GGGItemGroupData } from "./get-item-data.types.ts";
import type { CachedResponse, GggContext, ResponseCache } from "./types.ts";

const TRADE_API_URL = "https://api.example.test/trade";
const HOUR_MS = 3_600_000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

let fetchMock = jest.fn<FetchLike>();

/** Really stores, so a second call can be answered from what the first one wrote. */
function fakeCache(): ResponseCache {
  const stored = new Map<string, CachedResponse>();

  return {
    get: async (key) => stored.get(key),
    set: async (key, value) => {
      stored.set(key, value);
    },
  };
}

const context = (cache?: ResponseCache): GggContext => ({
  limiter: {
    acquire: async () => {},
    explainWait: () => undefined,
    setRules: () => {},
    observe: () => {},
    penalize: () => {},
  },
  tradeApiUrl: TRADE_API_URL,
  currencyApiUrl: "https://cdn.example.test/currency-exchange",
  forumUrl: "https://www.example.test/forum",
  userAgent: "poe-stuff-test/1.0 (contact: nobody@example.test)",
  ...(cache === undefined ? {} : { cache }),
});

const group = (...entries: GGGItemGroupData["entries"]): GGGItemGroupData => ({
  id: "weapon",
  label: "Weapons",
  entries,
});

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ result: [group()] }), { status: 200 }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("mapGGGItemDataToGGGItem", () => {
  it("reads a row flagged unique as a unique standing on its base type", () => {
    const item = mapGGGItemDataToGGGItem({
      name: "Headhunter",
      type: "Leather Belt",
      flags: { unique: true },
    });

    expect(item).toEqual({
      kind: "unique",
      name: "Headhunter",
      baseType: "Leather Belt",
      displayText: "Headhunter",
    });
  });

  it("reads a row flagged unique but carrying no name as a plain base", () => {
    const item = mapGGGItemDataToGGGItem({
      type: "Leather Belt",
      flags: { unique: true },
    });

    expect(item.kind).toBe("base");
  });

  it("labels a unique by its own name when the row carries no display text", () => {
    const item = mapGGGItemDataToGGGItem({
      name: "Headhunter",
      type: "Leather Belt",
      flags: { unique: true },
    });

    expect(item.displayText).toBe("Headhunter");
  });

  it("leaves a base with no display text without the key at all", () => {
    const item = mapGGGItemDataToGGGItem({ type: "Leather Belt" });

    expect("displayText" in item).toBe(false);
  });

  it("carries the variant tag that separates two transfigured gems of one name", () => {
    const item = mapGGGItemDataToGGGItem({
      type: "Vaal Cold Snap",
      disc: "of Power",
    });

    expect(item.variantTag).toBe("of Power");
  });
});

describe("mapGGGItemGroupDataToGGGItemGroup", () => {
  it("keeps every entry under the id and label of the group it arrived in", () => {
    const mapped = mapGGGItemGroupDataToGGGItemGroup(
      group({ type: "Leather Belt" }, { type: "Rustic Sash" }),
    );

    expect(mapped.id).toBe("weapon");
    expect(mapped.label).toBe("Weapons");
    expect(mapped.items).toHaveLength(2);
  });
});

describe("getItemData", () => {
  it("reads a stored answer back within the same hour", async () => {
    const cache = fakeCache();

    await getItemData(context(cache));
    await jest.advanceTimersByTimeAsync(HOUR_MS - 1);
    await getItemData(context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks GGG again once the clock passes the hour", async () => {
    const cache = fakeCache();

    await getItemData(context(cache));
    await jest.advanceTimersByTimeAsync(HOUR_MS);
    await getItemData(context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
