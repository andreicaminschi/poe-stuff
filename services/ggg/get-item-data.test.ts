import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { getItemData, mapGGGItemDataToGGGItem } from "./get-item-data.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("mapGGGItemDataToGGGItem", () => {
  it("reads a flagged item with a name as a unique, shown by its text", () => {
    expect(
      mapGGGItemDataToGGGItem({
        name: "Headhunter",
        type: "Leather Belt",
        text: "Headhunter Leather Belt",
        disc: "x",
        flags: { unique: true },
      }),
    ).toEqual({
      kind: "unique",
      name: "Headhunter",
      baseType: "Leather Belt",
      displayText: "Headhunter Leather Belt",
      variantTag: "x",
    });
  });

  it("shows a unique with no text by its name", () => {
    expect(
      mapGGGItemDataToGGGItem({ name: "HH", type: "Belt", flags: { unique: true } }),
    ).toEqual({ kind: "unique", name: "HH", baseType: "Belt", displayText: "HH" });
  });

  it("reads a unique flag with no name as a base", () => {
    expect(mapGGGItemDataToGGGItem({ type: "Belt", flags: { unique: true } })).toEqual({
      kind: "base",
      baseType: "Belt",
    });
  });

  it("reads a named item without the unique flag as a base and drops the name", () => {
    expect(mapGGGItemDataToGGGItem({ name: "HH", type: "Belt", text: "t", disc: "d" })).toEqual({
      kind: "base",
      baseType: "Belt",
      displayText: "t",
      variantTag: "d",
    });
  });
});

describe("getItemData", () => {
  it("asks for the item list and maps every group", async () => {
    const fetchMock = stubFetch({
      result: [{ id: "g", label: "Gems", entries: [{ type: "Fireball" }] }],
    });

    const groups = await getItemData(context);

    expect(fetchMock.mock.calls[0]![0]).toBe("https://trade.test/api/data/items");
    expect(groups).toEqual([
      { id: "g", label: "Gems", items: [{ kind: "base", baseType: "Fireball" }] },
    ]);
  });

  it("serves a cached answer only inside the hour that stored it", async () => {
    jest.useFakeTimers({ now: 3_600_000 * 10 + 1 });
    const store = new Map();
    const cache = { get: async (k: string) => store.get(k), set: async (k: string, v: unknown) => void store.set(k, v) };
    const fetchMock = stubFetch({ result: [] }, { result: [] });

    await getItemData({ ...context, cache });
    jest.setSystemTime(3_600_000 * 11 - 1);
    await getItemData({ ...context, cache });
    jest.setSystemTime(3_600_000 * 11);
    await getItemData({ ...context, cache });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
