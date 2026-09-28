import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { getStats, mapGGGStatDataToGGGStat } from "./get-stats.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("mapGGGStatDataToGGGStat", () => {
  it("lifts a stat's option list out of the wrapper GGG sends it in", () => {
    const stat = mapGGGStatDataToGGGStat({
      id: "s",
      text: "t (#)",
      type: "implicit",
      option: { options: [{ id: 1, text: "Lesser" }] },
    });

    expect(stat).toEqual({ id: "s", text: "t (#)", type: "implicit", options: [{ id: 1, text: "Lesser" }] });
  }); // option.options becomes options

  it("leaves options out entirely when the stat has none", () => {
    const stat = mapGGGStatDataToGGGStat({ id: "s", text: "t", type: "explicit" });

    expect(stat).toEqual({ id: "s", text: "t", type: "explicit" });
  }); // key absent, not undefined
});

describe("getStats", () => {
  it("asks for the stat list and flattens three groups, one of them empty, into one list in order", async () => {
    const fetchMock = stubFetch({
      result: [
        { id: "a", label: "A", entries: [{ id: "1", text: "x", type: "explicit" }] },
        { id: "b", label: "B", entries: [] },
        { id: "c", label: "C", entries: [{ id: "2", text: "y", type: "pseudo" }] },
      ],
    });

    const stats = await getStats(context);

    expect(fetchMock.mock.calls[0]![0]).toBe("https://trade.test/api/data/stats");
    expect(stats.map((s) => s.id)).toEqual(["1", "2"]);
  }); // group is repeated in each stat's type

  it("asks again once the hour turns over, even with a cache", async () => {
    jest.useFakeTimers({ now: 3_600_000 * 11 - 1 });
    const store = new Map();
    const cache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => void store.set(k, v),
    };
    const fetchMock = stubFetch({ result: [] }, { result: [] });

    await getStats({ ...context, cache });
    jest.setSystemTime(3_600_000 * 11);
    await getStats({ ...context, cache });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // hour salt read per call
});
