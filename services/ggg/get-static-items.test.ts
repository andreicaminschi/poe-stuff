import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  getStaticItems,
  mapGGGStaticGroupDataToGGGStaticItems,
} from "./get-static-items.ts";
import type { GGGStaticGroupData } from "./get-static-items.types.ts";
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

const currency: GGGStaticGroupData = {
  id: "Currency",
  label: "Currency",
  entries: [
    { id: "chaos", text: "Chaos Orb" },
    { id: "sep", text: "" },
    { id: "divine", text: "Divine Orb" },
  ],
};

const fragments: GGGStaticGroupData = {
  id: "Fragments",
  label: "Fragments",
  entries: [{ id: "mortal-hope", text: "Mortal Hope" }],
};

const answerWith = (...groups: GGGStaticGroupData[]) =>
  new Response(JSON.stringify({ result: groups }), { status: 200 });

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(async () => answerWith(currency, fragments));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("mapGGGStaticGroupDataToGGGStaticItems", () => {
  it("drops the divider rows the trade site draws between blocks of buttons", () => {
    const items = mapGGGStaticGroupDataToGGGStaticItems(currency);

    expect(items.map((item) => item.id)).toEqual(["chaos", "divine"]);
  });

  it("stamps each row with the category and label of its group", () => {
    const items = mapGGGStaticGroupDataToGGGStaticItems(currency);

    expect(items[0]?.category).toBe("Currency");
    expect(items[0]?.label).toBe("Currency");
  });
});

describe("getStaticItems", () => {
  it("flattens every group into one list of items", async () => {
    const items = await getStaticItems(context());

    expect(items.map((item) => item.id)).toEqual([
      "chaos",
      "divine",
      "mortal-hope",
    ]);
  });

  it("asks GGG again once the clock passes the hour", async () => {
    const cache = fakeCache();

    await getStaticItems(context(cache));
    await jest.advanceTimersByTimeAsync(HOUR_MS);
    await getStaticItems(context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
