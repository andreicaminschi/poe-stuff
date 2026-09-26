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

    await expect(getVersion(temp.lake, ID)).rejects.toThrow(/ENOENT/);
  });

  it("reads a bare game row with empty conditions and no optional flags", async () => {
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
  });

  it("keeps a false filterable flag but drops a false excluded flag", async () => {
    await seedDraft(temp.lake, ID, { items: { a: { ...currency, filterable: false, excluded: false } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]).toMatchObject({ filterable: false });
    expect(draft.items["a"]).not.toHaveProperty("excluded");
  });

  it("reads an authored row with an empty base type and replaces list when they are missing", async () => {
    const { baseType: _, ...noBase } = unique;
    await seedDraft(temp.lake, ID, { "authored.seeded": { u: noBase } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["u"]).toMatchObject({ source: "authored", baseType: "", replaces: [] });
  });

  it("lets a manual authored row replace a seeded one with the same key", async () => {
    await seedDraft(temp.lake, ID, { "authored.seeded": { u: unique }, "authored.manual": { u: { ...unique, reason: "manual" } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["u"]).toMatchObject({ reason: "manual" });
  });

  it("lets an authored row replace a game row with the same key", async () => {
    await seedDraft(temp.lake, ID, { items: { a: currency }, "authored.manual": { a: { ...unique, name: "a" } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]?.source).toBe("authored");
  });

  it("uses manual variants in place of seeded ones, whole list for whole list", async () => {
    await seedDraft(temp.lake, ID, {
      items: { a: currency, b: { ...currency, name: "b" } },
      "variants.seeded": { a: [variant("s1"), variant("s2")], b: [variant("seeded")] },
      "variants.manual": { a: [variant("m")] },
    });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.items["a"]?.variants).toEqual([variant("m")]);
    expect(draft.items["b"]?.variants).toEqual([variant("seeded")]);
  });

  it("defaults a category to chaos tiering and drops its empty lists", async () => {
    await seedDraft(temp.lake, ID, { categories: { currency: { conditions: [], hints: [], samples: [], catchAll: false } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.categories["currency"]).toEqual({ path: "currency", tiering: "chaos", conditions: [] });
  });

  it("keeps a category's order of zero", async () => {
    await seedDraft(temp.lake, ID, { categories: { currency: { conditions: [], order: 0 } } });

    const draft = await getVersion(temp.lake, ID);

    expect(draft.categories["currency"]?.order).toBe(0);
  });
});
