import { describe, expect, it } from "@jest/globals";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { Item } from "../item.ts";
import { fromPoeWatch } from "./from-poe-watch.ts";

const row = (name: string, extra: Partial<Item> = {}): Item => ({
  key: name,
  name,
  category: "c",
  subcategory: null,
  baseTypes: [name],
  ...extra,
});

const listing = (id: number, name: string, mean: number, daily: number, extra: object = {}): ItemData =>
  ({ id, name, mean, daily, lowConfidence: false, icon: "", frame: 0, ...extra }) as unknown as ItemData;

const ratio = (id: number, name: string, chaos?: number): ExchangeRatioItem =>
  ({
    id,
    name,
    category: "currency",
    ...(chaos === undefined
      ? {}
      : { price: { chaos, lowConfidence: true } }),
  }) as unknown as ExchangeRatioItem;

const corruption = (itemId: number, outcomes: { name: string; mean: number; daily: number }[]): ItemCorruptions =>
  ({
    item_id: itemId,
    corruptions: outcomes.map((one) => ({ lowConfidence: false, ...one })),
  }) as unknown as ItemCorruptions;

const synthIcon = `https://x/image/${Buffer.from("{\"synthesised\":true}").toString("base64url")}/a.png`;

describe("fromPoeWatch", () => {
  describe("a row without variants", () => {
    it("takes the exchange price over any listing", () => {
      const [priced] = fromPoeWatch(
        [row("Divine Orb")],
        [listing(1, "Divine Orb", 190, 50)],
        [ratio(9, "Divine Orb", 376)],
        [],
      );

      expect(priced).toMatchObject({
        meanPrice: 376,
        lowConfidence: true,
        poeWatch: { source: "poeWatch:exchange", id: 9, name: "Divine Orb" },
      });
    });

    it("falls back to listings when the exchange has no trade in the window", () => {
      const [priced] = fromPoeWatch(
        [row("Divine Orb")],
        [listing(1, "Divine Orb", 190, 50)],
        [ratio(9, "Divine Orb")],
        [],
      );

      expect(priced?.meanPrice).toBe(190);
    });

    it("skips the exchange when the row's selector filters on a field", () => {
      const rows = [row("Gem", { listing: { name: "Gem", gemLevel: 21 } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Gem", 5, 1, { gemLevel: 21 })], [ratio(9, "Gem", 1)], []);

      expect(priced?.meanPrice).toBe(5);
    });

    it("picks the most listed form, ties going to the dearer", () => {
      const listings = [listing(1, "Ring", 10, 5), listing(2, "Ring", 30, 9), listing(3, "Ring", 99, 9)];

      const [priced] = fromPoeWatch([row("Ring")], listings, [], []);

      expect(priced?.poeWatch).toEqual({ source: "poeWatch:items", id: 3, name: "Ring" });
    });

    it("keeps the first of two listings equal in count and mean", () => {
      const [priced] = fromPoeWatch([row("Ring")], [listing(1, "Ring", 10, 5), listing(2, "Ring", 10, 5)], [], []);

      expect(priced?.poeWatch?.id).toBe(1);
    });

    it("returns the row untouched when nothing lists it", () => {
      const original = row("Nothing");

      expect(fromPoeWatch([original], [], [], [])[0]).toBe(original);
    });

    it("prices only the listings every selector key agrees with", () => {
      const rows = [row("Gem", { listing: { gemLevel: 20, corrupted: false } as never })];
      const listings = [
        listing(1, "Gem", 50, 99, { gemLevel: 21, corrupted: false }),
        listing(2, "Gem", 7, 1, { gemLevel: 20, corrupted: false }),
      ];

      expect(fromPoeWatch(rows, listings, [], [])[0]?.meanPrice).toBe(7);
    });

    it("leaves the row unpriced when the selector names a field the listing lacks", () => {
      const rows = [row("Ring", { listing: { gemLevel: 20 } as never })];

      expect(fromPoeWatch(rows, [listing(1, "Ring", 5, 1)], [], [])[0]?.meanPrice).toBeUndefined();
    });

    it("reads synthesis off the icon", () => {
      const rows = [row("Ring", { listing: { synthesised: true } as never })];
      const listings = [listing(1, "Ring", 5, 99), listing(2, "Ring", 80, 1, { icon: synthIcon })];

      expect(fromPoeWatch(rows, listings, [], [])[0]?.meanPrice).toBe(80);
    });

    it("looks listings up under the selector's name", () => {
      const rows = [row("Large Cluster Jewel", { listing: { name: "Large Cluster Jewel (A\nB)" } as never })];

      const priced = fromPoeWatch(rows, [listing(1, "Large Cluster Jewel (A\nB)", 12, 1)], [], []);

      expect(priced[0]?.meanPrice).toBe(12);
    });

    it("prices a two-line enchant listed in the other order", () => {
      const rows = [row("Large Cluster Jewel", { listing: { name: "Large Cluster Jewel (A\nB)" } as never })];

      const priced = fromPoeWatch(rows, [listing(1, "Large Cluster Jewel (B\nA)", 12, 1)], [], []);

      expect(priced[0]?.meanPrice).toBe(12);
    });

    it("prices several links at the dearest one", () => {
      const rows = [row("R", { listing: [{ name: "A" }, { name: "B" }] as never })];

      expect(fromPoeWatch(rows, [listing(1, "A", 3, 50), listing(2, "B", 8, 1)], [], [])[0]?.meanPrice).toBe(8);
    });

    it("checks the exchange under every link's name, taking the dearest", () => {
      const rows = [row("R", { listing: [{ name: "A" }, { name: "B" }] as never })];

      expect(fromPoeWatch(rows, [], [ratio(1, "B", 99), ratio(2, "A", 4)], [])[0]?.meanPrice).toBe(99);
    });

    it("reads a corruption outcome off the most listed of every listing", () => {
      const rows = [row("Unique", { listing: { corruption: "Imp" } as never })];
      const listings = [listing(1, "Unique", 1, 1), listing(2, "Unique", 1, 1)];
      const outcomes = [
        corruption(1, [{ name: "Imp", mean: 40, daily: 2 }]),
        corruption(2, [
          { name: "Imp", mean: 90, daily: 5 },
          { name: "Other", mean: 999, daily: 99 },
        ]),
      ];

      expect(fromPoeWatch(rows, listings, [], outcomes)[0]).toMatchObject({
        meanPrice: 90,
        poeWatch: { source: "poeWatch:items", id: 2, name: "Imp" },
      });
    });

    it("leaves a corruption selector unpriced when no listing carries that outcome", () => {
      const rows = [row("Unique", { listing: { corruption: "Imp" } as never })];

      expect(fromPoeWatch(rows, [listing(1, "Unique", 1, 1)], [], [])[0]?.meanPrice).toBeUndefined();
    });
  });

  describe("a row with variants", () => {
    it("prices each variant off listings and never the row itself, ignoring the exchange", () => {
      const rows = [
        row("Gem", {
          variants: [
            { name: "20", conditions: [], listing: { gemLevel: 20 } },
            { name: "none", conditions: [] },
          ] as never,
        }),
      ];
      const listings = [listing(1, "Gem", 5, 9, { gemLevel: 1 }), listing(2, "Gem", 40, 1, { gemLevel: 20 })];

      const [priced] = fromPoeWatch(rows, listings, [ratio(3, "Gem", 1000)], []);

      expect([priced?.meanPrice, priced?.variants?.map((variant) => variant.meanPrice)]).toEqual([undefined, [40, 5]]);
    });

    it("keeps a variant nothing lists without a price", () => {
      const rows = [row("Gem", { variants: [{ name: "v", conditions: [], listing: { gemLevel: 20 } }] as never })];

      expect(fromPoeWatch(rows, [], [], [])[0]?.variants?.[0]).toEqual({
        name: "v",
        conditions: [],
        listing: { gemLevel: 20 },
      });
    });
  });
});
