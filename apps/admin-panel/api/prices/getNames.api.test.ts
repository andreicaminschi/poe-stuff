import { describe, expect, it } from "@jest/globals";
import { getCorruptionNames, getExchangeNames, getListingNames } from "./getNames.api.ts";
import { listing, poeWatch } from "./prices.test-helpers.ts";

const outcome = (name: string, daily: number, extra: object = {}) => ({
  name,
  mean: 99.6,
  daily,
  lowConfidence: false,
  ...extra,
});

describe("getListingNames", () => {
  it("labels each listing with its category, its price rounded to whole chaos and its daily volume", async () => {
    const names = await getListingNames(poeWatch({ compact: [listing({}), listing({ mean: 10.5 })] }), "L");

    expect(names.map((name) => name.label)).toEqual(["armour · 10c · 7/d", "armour · 11c · 7/d"]);
  }); // 10.4 rounds down, 10.5 rounds up

  it("keeps two listings of the same name as two entries", async () => {
    const names = await getListingNames(poeWatch({ compact: [listing({ linkCount: 6 }), listing({})] }), "L");

    expect(names.map((name) => name.name)).toEqual(["Tabula Rasa", "Tabula Rasa"]);
  }); // forms differ by query, not by name

  it("gives each listing the query that finds it again", async () => {
    const [name] = await getListingNames(poeWatch({ compact: [listing({})] }), "L");

    expect(name?.listing).toEqual({ name: "Tabula Rasa", frame: 3, synthesised: false });
  });
});

describe("getExchangeNames", () => {
  it("lists each traded name once, in the order it was first seen", async () => {
    const service = poeWatch({ ratios: [{ name: "Divine Orb" }, { name: "Chaos Orb" }, { name: "Divine Orb" }] });

    const names = await getExchangeNames(service, "L");

    expect(names).toEqual([
      { name: "Divine Orb", label: "exchange", listing: { name: "Divine Orb" } },
      { name: "Chaos Orb", label: "exchange", listing: { name: "Chaos Orb" } },
    ]);
  }); // one ratio per pair, so names repeat
});

describe("getCorruptionNames", () => {
  it("names each outcome after its unique, and flags a low-confidence price", async () => {
    const service = poeWatch({
      compact: [listing({ id: 7 })],
      corruptions: [{ item_id: 7, corruptions: [outcome("+1 to Level", 3, { lowConfidence: true })] }],
    });

    const names = await getCorruptionNames(service, "L");

    expect(names).toEqual([
      {
        name: "Tabula Rasa (+1 to Level)",
        label: "corruption · 100c · 3/d · low",
        listing: { name: "Tabula Rasa", corruption: "+1 to Level" },
      },
    ]);
  }); // the name is joined through the listing id

  it("leaves the low flag off a confident price", async () => {
    const service = poeWatch({ compact: [listing({ id: 7 })], corruptions: [{ item_id: 7, corruptions: [outcome("x", 3)] }] });

    const [name] = await getCorruptionNames(service, "L");

    expect(name?.label).toBe("corruption · 100c · 3/d");
  });

  it("skips corruptions of an item that has no listing", async () => {
    const service = poeWatch({ compact: [], corruptions: [{ item_id: 7, corruptions: [outcome("x", 1)] }] });

    const names = await getCorruptionNames(service, "L");

    expect(names).toEqual([]);
  }); // no listing means no name to show

  it("keeps the more-listed of two copies of one outcome on the same item", async () => {
    const service = poeWatch({
      compact: [listing({ id: 7 })],
      corruptions: [{ item_id: 7, corruptions: [outcome("x", 2, { mean: 1 }), outcome("x", 9, { mean: 2 })] }],
    });

    const names = await getCorruptionNames(service, "L");

    expect(names.map((name) => name.label)).toEqual(["corruption · 2c · 9/d"]);
  }); // highest daily volume wins

  it("keeps the first of two copies of one outcome that are listed equally often", async () => {
    const service = poeWatch({
      compact: [listing({ id: 7 })],
      corruptions: [{ item_id: 7, corruptions: [outcome("x", 5, { mean: 1 }), outcome("x", 5, { mean: 2 })] }],
    });

    const names = await getCorruptionNames(service, "L");

    expect(names.map((name) => name.label)).toEqual(["corruption · 1c · 5/d"]);
  }); // strictly greater replaces; a tie does not

  it("keeps one entry per item and outcome even when two items share a name", async () => {
    const service = poeWatch({
      compact: [listing({ id: 1 }), listing({ id: 2 })],
      corruptions: [
        { item_id: 1, corruptions: [outcome("x", 2, { mean: 1 }), outcome("y", 5, { mean: 1 })] },
        { item_id: 2, corruptions: [outcome("x", 9, { mean: 2 }), outcome("y", 5, { mean: 2 })] },
      ],
    });

    const names = await getCorruptionNames(service, "L");

    expect(names.map((name) => [name.name, name.label])).toEqual([
      ["Tabula Rasa (x)", "corruption · 1c · 2/d"],
      ["Tabula Rasa (y)", "corruption · 1c · 5/d"],
      ["Tabula Rasa (x)", "corruption · 2c · 9/d"],
      ["Tabula Rasa (y)", "corruption · 2c · 5/d"],
    ]);
  }); // keyed by item id, not by display name
});
