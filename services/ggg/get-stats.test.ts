import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { getStats, mapGGGStatDataToGGGStat } from "./get-stats.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

afterEach(() => {
  jest.restoreAllMocks();
});

describe("mapGGGStatDataToGGGStat", () => {
  it("lifts the option list out of its wrapper", () => {
    expect(
      mapGGGStatDataToGGGStat({
        id: "s",
        text: "t (#)",
        type: "implicit",
        option: { options: [{ id: 1, text: "Lesser" }] },
      }),
    ).toEqual({ id: "s", text: "t (#)", type: "implicit", options: [{ id: 1, text: "Lesser" }] });
  });

  it("leaves options out when the stat has none", () => {
    expect(mapGGGStatDataToGGGStat({ id: "s", text: "t", type: "explicit" })).toEqual({
      id: "s",
      text: "t",
      type: "explicit",
    });
  });
});

describe("getStats", () => {
  it("asks for the stat list and flattens every group into one list", async () => {
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
  });
});
