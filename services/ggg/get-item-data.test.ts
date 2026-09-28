import { afterEach, describe, it, expect, jest } from "@jest/globals";
import { getItemData, mapGGGItemDataToGGGItem } from "./get-item-data.ts";
import { context, stubFetch } from "./endpoints.test-helpers.ts";

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("mapGGGItemDataToGGGItem", () => {
  it("reads Headhunter, flagged unique and named, as a unique on a Leather Belt shown by its text", () => {
    const item = mapGGGItemDataToGGGItem({
      name: "Headhunter",
      type: "Leather Belt",
      text: "Headhunter Leather Belt",
      disc: "x",
      flags: { unique: true },
    });

    expect(item).toEqual({
      kind: "unique",
      name: "Headhunter",
      baseType: "Leather Belt",
      displayText: "Headhunter Leather Belt",
      variantTag: "x",
    });
  }); // kind is synthesised from the flag

  it("shows a unique that carries no text by its name", () => {
    const item = mapGGGItemDataToGGGItem({ name: "HH", type: "Belt", flags: { unique: true } });

    expect(item).toEqual({ kind: "unique", name: "HH", baseType: "Belt", displayText: "HH" });
  }); // text ?? name; no variantTag key without disc

  it("reads an item flagged unique but carrying no name as a base", () => {
    const item = mapGGGItemDataToGGGItem({ type: "Belt", flags: { unique: true } });

    expect(item).toEqual({ kind: "base", baseType: "Belt" });
  }); // a unique needs both flag and name

  it("reads a named item without the unique flag as a base and drops the name", () => {
    const item = mapGGGItemDataToGGGItem({ name: "HH", type: "Belt", text: "t", disc: "d" });

    expect(item).toEqual({ kind: "base", baseType: "Belt", displayText: "t", variantTag: "d" });
  }); // name alone does not make a unique
});

describe("getItemData", () => {
  it("asks for the trade site's item list and maps every entry of every group", async () => {
    const fetchMock = stubFetch({
      result: [{ id: "g", label: "Gems", entries: [{ type: "Fireball" }] }],
    });

    const groups = await getItemData(context);

    expect(fetchMock.mock.calls[0]![0]).toBe("https://trade.test/api/data/items");
    expect(groups).toEqual([{ id: "g", label: "Gems", items: [{ kind: "base", baseType: "Fireball" }] }]);
  }); // entries renamed to items

  it("serves a stored answer up to the last millisecond of its hour and asks again on the next", async () => {
    jest.useFakeTimers({ now: 3_600_000 * 10 + 1 });
    const store = new Map();
    const cache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => void store.set(k, v),
    };
    const fetchMock = stubFetch({ result: [] }, { result: [] });

    await getItemData({ ...context, cache });
    jest.setSystemTime(3_600_000 * 11 - 1);
    await getItemData({ ...context, cache });
    jest.setSystemTime(3_600_000 * 11);
    await getItemData({ ...context, cache });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  }); // the hour is the cache salt
});
