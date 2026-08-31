import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { getStats, mapGGGStatDataToGGGStat } from "./get-stats.ts";
import type { GGGStatGroupData } from "./get-stats.types.ts";
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
  userAgent: "poe-stuff-test/1.0 (contact: nobody@example.test)",
  ...(cache === undefined ? {} : { cache }),
});

const explicit: GGGStatGroupData = {
  id: "explicit",
  label: "Explicit",
  entries: [{ id: "explicit.stat_1", text: "# to maximum Life", type: "explicit" }],
};

const enchant: GGGStatGroupData = {
  id: "enchant",
  label: "Enchant",
  entries: [{ id: "enchant.stat_2", text: "Allocates #", type: "enchant" }],
};

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  fetchMock = jest.fn<FetchLike>(
    async () =>
      new Response(JSON.stringify({ result: [explicit, enchant] }), {
        status: 200,
      }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("mapGGGStatDataToGGGStat", () => {
  it("lifts a stat's options out of the wrapper the payload nests them in", () => {
    const stat = mapGGGStatDataToGGGStat({
      id: "enchant.stat_2",
      text: "Allocates #",
      type: "enchant",
      option: { options: [{ id: 1, text: "Acrobatics" }] },
    });

    expect(stat.options).toEqual([{ id: 1, text: "Acrobatics" }]);
  });

  it("leaves a stat that takes no option without an options list", () => {
    const stat = mapGGGStatDataToGGGStat({
      id: "explicit.stat_1",
      text: "# to maximum Life",
      type: "explicit",
    });

    expect("options" in stat).toBe(false);
  });
});

describe("getStats", () => {
  it("flattens the groups, since every stat already names its own group", async () => {
    const stats = await getStats(context());

    expect(stats.map((stat) => stat.type)).toEqual(["explicit", "enchant"]);
  });

  it("asks GGG again once the clock passes the hour", async () => {
    const cache = fakeCache();

    await getStats(context(cache));
    await jest.advanceTimersByTimeAsync(HOUR_MS);
    await getStats(context(cache));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
