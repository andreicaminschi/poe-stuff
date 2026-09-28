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
    it("prices a Divine Orb at the exchange's 376c rather than the listings' 190c", () => {
      const [priced] = fromPoeWatch([row("Divine Orb")], [listing(1, "Divine Orb", 190, 50)], [ratio(9, "Divine Orb", 376)], []);

      expect(priced).toMatchObject({
        meanPrice: 376,
        lowConfidence: true,
        poeWatch: { source: "poeWatch:exchange", id: 9, name: "Divine Orb" },
      });
    }); // trades beat asking prices

    it("falls back to the listings when the exchange had no trade in the window", () => {
      const [priced] = fromPoeWatch([row("Divine Orb")], [listing(1, "Divine Orb", 190, 50)], [ratio(9, "Divine Orb")], []);

      expect(priced?.meanPrice).toBe(190);
    }); // a ratio with no price is dropped, not read as zero

    it("skips the exchange when the row's selector asks for a level 21 gem", () => {
      const rows = [row("Gem", { listing: { name: "Gem", gemLevel: 21 } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Gem", 5, 1, { gemLevel: 21 })], [ratio(9, "Gem", 1)], []);

      expect(priced?.meanPrice).toBe(5);
    }); // the exchange has no per-form rows

    it("reads the most listed form, and between two with nine listings each the dearer", () => {
      const listings = [listing(1, "Ring", 10, 5), listing(2, "Ring", 30, 9), listing(3, "Ring", 99, 9)];

      const [priced] = fromPoeWatch([row("Ring")], listings, [], []);

      expect(priced?.poeWatch).toEqual({ source: "poeWatch:items", id: 3, name: "Ring" });
    }); // tie on count breaks on mean

    it("keeps the first of two listings equal in count and in mean", () => {
      const [priced] = fromPoeWatch([row("Ring")], [listing(1, "Ring", 10, 5), listing(2, "Ring", 10, 5)], [], []);

      expect(priced?.poeWatch?.id).toBe(1);
    }); // a full tie is stable

    it("prices two rows that share a display name with the same listing", () => {
      const rows = [row("Ring", { key: "a" }), row("Ring", { key: "b" })];

      const priced = fromPoeWatch(rows, [listing(1, "Ring", 7, 1)], [], []);

      expect(priced.map((one) => one.meanPrice)).toEqual([7, 7]);
    }); // PoeWatch has no metadata id to tell them apart

    it("returns the very same row when nothing lists it", () => {
      const original = row("Nothing");

      const [priced] = fromPoeWatch([original], [], [], []);

      expect(priced).toBe(original);
    }); // no price keys are added as undefined

    it("prices only the listings every selector key agrees with", () => {
      const rows = [row("Gem", { listing: { gemLevel: 20, corrupted: false } as never })];
      const listings = [listing(1, "Gem", 50, 99, { gemLevel: 21, corrupted: false }), listing(2, "Gem", 7, 1, { gemLevel: 20, corrupted: false })];

      const [priced] = fromPoeWatch(rows, listings, [], []);

      expect(priced?.meanPrice).toBe(7);
    }); // the more listed level 21 must not win

    it("leaves the row unpriced when the selector names a field the listing lacks", () => {
      const rows = [row("Ring", { listing: { gemLevel: 20 } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Ring", 5, 1)], [], []);

      expect(priced?.meanPrice).toBeUndefined();
    }); // undefined !== 20, so no match rather than an error

    it("reads whether a listing is synthesised off its icon", () => {
      const rows = [row("Ring", { listing: { synthesised: true } as never })];
      const listings = [listing(1, "Ring", 5, 99), listing(2, "Ring", 80, 1, { icon: synthIcon })];

      const [priced] = fromPoeWatch(rows, listings, [], []);

      expect(priced?.meanPrice).toBe(80);
    }); // PoeWatch has no synthesised field

    it("looks listings up under the selector's name rather than the row's", () => {
      const rows = [row("Large Cluster Jewel", { listing: { name: "Large Cluster Jewel (A\nB)" } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Large Cluster Jewel (A\nB)", 12, 1)], [], []);

      expect(priced?.meanPrice).toBe(12);
    }); // cluster jewels are listed under their enchant

    it("prices a two-line enchant PoeWatch lists in the other order", () => {
      const rows = [row("Large Cluster Jewel", { listing: { name: "Large Cluster Jewel (A\nB)" } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Large Cluster Jewel (B\nA)", 12, 1)], [], []);

      expect(priced?.meanPrice).toBe(12);
    }); // lines inside the parentheses are sorted on both sides

    it("prices a row linked to two listings at the dearer 8c, not the more listed 3c", () => {
      const rows = [row("R", { listing: [{ name: "A" }, { name: "B" }] as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "A", 3, 50), listing(2, "B", 8, 1)], [], []);

      expect(priced?.meanPrice).toBe(8);
    }); // across links it is dearest, within one link most listed

    it("checks the exchange under every linked name and takes the dearest", () => {
      const rows = [row("R", { listing: [{ name: "A" }, { name: "B" }] as never })];

      const [priced] = fromPoeWatch(rows, [], [ratio(1, "B", 99), ratio(2, "A", 4)], []);

      expect(priced?.meanPrice).toBe(99);
    }); // exchange order does not matter

    it("reads a corruption outcome off whichever listing carries it most", () => {
      const rows = [row("Unique", { listing: { corruption: "Imp" } as never })];
      const listings = [listing(1, "Unique", 1, 1), listing(2, "Unique", 1, 1)];
      const outcomes = [
        corruption(1, [{ name: "Imp", mean: 40, daily: 2 }]),
        corruption(2, [
          { name: "Imp", mean: 90, daily: 5 },
          { name: "Other", mean: 999, daily: 99 },
        ]),
      ];

      const [priced] = fromPoeWatch(rows, listings, [], outcomes);

      expect(priced).toMatchObject({ meanPrice: 90, poeWatch: { source: "poeWatch:items", id: 2, name: "Imp" } });
    }); // the busier "Other" outcome is a different corruption

    it("leaves a corruption selector unpriced when no listing carries that outcome", () => {
      const rows = [row("Unique", { listing: { corruption: "Imp" } as never })];

      const [priced] = fromPoeWatch(rows, [listing(1, "Unique", 1, 1)], [], []);

      expect(priced?.meanPrice).toBeUndefined();
    }); // never falls back to the plain listing
  });

  describe("a row with variants", () => {
    it("prices each variant off the listings and never the row itself, ignoring a 1000c exchange price", () => {
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
    }); // a variant with no selector takes the most listed form

    it("keeps a variant nothing lists exactly as it was, with no price", () => {
      const rows = [row("Gem", { variants: [{ name: "v", conditions: [], listing: { gemLevel: 20 } }] as never })];

      const [priced] = fromPoeWatch(rows, [], [], []);

      expect(priced?.variants?.[0]).toEqual({ name: "v", conditions: [], listing: { gemLevel: 20 } });
    }); // no undefined price keys
  });
});
