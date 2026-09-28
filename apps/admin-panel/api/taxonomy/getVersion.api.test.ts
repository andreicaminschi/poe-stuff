import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { variant } from "./draft.test-helpers.ts";
import { getVersion } from "./getVersion.api.ts";

const ID = "3.29.2";
const currency = { name: "a", category: "currency", subcategory: null };
const unique = { name: "u", baseType: "Leather Belt", category: "unique", subcategory: "regular", reason: "r" };

describe("getVersion", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  it("fails when one of the six files is missing", async () => {
    await temp.lake.writeJson(`taxonomy/versions/${ID}/items.json`, {});

    const reading = getVersion(temp.lake, ID);

    await expect(reading).rejects.toThrow(/ENOENT/);
  }); // no fallback: a half version is broken

  it("reads a bare game row with empty conditions, no variants and no optional flags", async () => {
    await seedDraft(temp.lake, ID, { items: { a: currency } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]).toEqual({
      source: "ggg",
      key: "a",
      name: "a",
      classification: { category: "currency", subcategory: null },
      conditions: [],
      variants: [],
    });
  }); // missing conditions become [], not undefined

  it("keeps a filterable flag set to false", async () => {
    await seedDraft(temp.lake, ID, { items: { a: { ...currency, filterable: false } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]).toMatchObject({ filterable: false });
  }); // false filterable hides the row: it carries meaning

  it("drops an excluded flag set to false", async () => {
    await seedDraft(temp.lake, ID, { items: { a: { ...currency, excluded: false } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]).not.toHaveProperty("excluded");
  }); // excluded is only ever written as true

  it("reads an authored row with an empty base type and replaces list when they are missing", async () => {
    const { baseType: _, ...noBase } = unique;
    await seedDraft(temp.lake, ID, { "authored.seeded": { u: noBase } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["u"]).toMatchObject({ source: "authored", baseType: "", replaces: [] });
  });

  it("lets a manual authored row replace a seeded one with the same key", async () => {
    await seedDraft(temp.lake, ID, {
      "authored.seeded": { u: unique },
      "authored.manual": { u: { ...unique, reason: "manual" } },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["u"]).toMatchObject({ reason: "manual" });
  }); // manual is spread last

  it("lets an authored row replace a game row with the same key", async () => {
    await seedDraft(temp.lake, ID, { items: { a: currency }, "authored.manual": { a: { ...unique, name: "a" } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]?.source).toBe("authored");
  });

  it("uses an item's manual variants in place of its seeded ones, whole list for whole list", async () => {
    await seedDraft(temp.lake, ID, {
      items: { a: currency },
      "variants.seeded": { a: [variant("s1"), variant("s2")] },
      "variants.manual": { a: [variant("m")] },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]?.variants).toEqual([variant("m")]);
  }); // not merged: one manual variant hides both seeded ones

  it("keeps the seeded variants of an item that has no manual override", async () => {
    await seedDraft(temp.lake, ID, {
      items: { a: currency, b: { ...currency, name: "b" } },
      "variants.seeded": { b: [variant("seeded")] },
      "variants.manual": { a: [variant("m")] },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["b"]?.variants).toEqual([variant("seeded")]);
  });

  it("lets an empty manual list clear an item's seeded variants", async () => {
    await seedDraft(temp.lake, ID, {
      items: { a: currency },
      "variants.seeded": { a: [variant("s1")] },
      "variants.manual": { a: [] },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]?.variants).toEqual([]);
  }); // [] is an override, not absence

  it("defaults a category to chaos tiering and drops its empty lists and false catch-all", async () => {
    await seedDraft(temp.lake, ID, {
      categories: { currency: { conditions: [], hints: [], samples: [], rejects: [], catchAll: false } },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.categories["currency"]).toEqual({ path: "currency", tiering: "chaos", conditions: [] });
  });

  it("keeps a category's order of zero", async () => {
    await seedDraft(temp.lake, ID, { categories: { currency: { conditions: [], order: 0 } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.categories["currency"]?.order).toBe(0);
  }); // zero sorts first; a truthiness check would lose it
});
