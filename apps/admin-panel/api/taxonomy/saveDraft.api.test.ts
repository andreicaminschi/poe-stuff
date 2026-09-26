import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { authoredItem, category, gggItem, variant } from "./draft.test-helpers.ts";
import { saveDraft } from "./saveDraft.api.ts";

const ID = "3.29.2";
const read = (temp: TempLake, file: string) => temp.lake.readJson<Record<string, unknown>>(`taxonomy/versions/${ID}/${file}.json`);

describe("saveDraft", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, ID, {
      items: {
        a: { name: "a", category: "currency", subcategory: null },
        b: { name: "b", category: "currency", subcategory: null },
      },
      categories: { currency: { conditions: [] }, maps: { conditions: [] } },
      "variants.seeded": { a: [variant("seeded")] },
    });
  });
  afterEach(() => temp.remove());

  it("refuses a version that is not the newest draft", async () => {
    await expect(saveDraft(temp.lake, "3.29.1", {})).rejects.toThrow("cannot be edited");
  });

  describe("items", () => {
    it("rewrites only the changed game item and keeps the rest of the file", async () => {
      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { classification: { category: "maps", subcategory: "t16" } }) } });

      await expect(read(temp, "items")).resolves.toEqual({
        a: { name: "a", category: "maps", subcategory: "t16" },
        b: { name: "b", category: "currency", subcategory: null },
      });
    });

    it("drops empty conditions, false flags and a blank display name, and trims a real one", async () => {
      await saveDraft(temp.lake, ID, {
        items: {
          a: gggItem("a", { displayName: "   ", excluded: false, quest: false, unpriceable: false }),
          b: gggItem("b", { displayName: "  Bee  ", filterable: false, tradable: true }),
        },
      });

      const items = await read(temp, "items");
      expect(items["a"]).toEqual({ name: "a", category: "currency", subcategory: null });
      expect(items["b"]).toEqual({ name: "b", displayName: "Bee", category: "currency", subcategory: null, filterable: false, tradable: true });
    });

    it("refuses a game item the draft does not have, and writes nothing", async () => {
      await expect(saveDraft(temp.lake, ID, { items: { z: gggItem("z"), u: authoredItem("u") } })).rejects.toThrow(
        '"z" is not an item. Author a row instead.',
      );
      await expect(read(temp, "authored.manual")).resolves.toEqual({});
    });

    it("writes an authored row into the manual file with an empty replaces list left out", async () => {
      await saveDraft(temp.lake, ID, { items: { u: authoredItem("u") } });

      await expect(read(temp, "authored.manual")).resolves.toEqual({
        u: { name: "u", baseType: "Leather Belt", category: "unique", subcategory: "regular", reason: "a unique" },
      });
    });

    it("keeps an authored row's replaces list when it names something", async () => {
      await saveDraft(temp.lake, ID, { items: { u: authoredItem("u", { replaces: ["a"] }) } });

      await expect(read(temp, "authored.manual")).resolves.toMatchObject({ u: { replaces: ["a"] } });
    });
  });

  describe("variants", () => {
    it("writes no manual override when an item keeps its seeded variants", async () => {
      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { variants: [variant("seeded")] }) } });

      await expect(read(temp, "variants.manual")).resolves.toEqual({});
    });

    it("writes a manual override when an item's variants differ from the seeded ones", async () => {
      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { variants: [variant("manual")] }) } });

      await expect(read(temp, "variants.manual")).resolves.toEqual({ a: [variant("manual")] });
    });

    it("removes a manual override once the variants match the seeded ones again", async () => {
      await temp.lake.writeJson(`taxonomy/versions/${ID}/variants.manual.json`, { a: [variant("manual")] });

      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { variants: [variant("seeded")] }) } });

      await expect(read(temp, "variants.manual")).resolves.toEqual({});
    });

    it("stores an empty override when the variants are cleared", async () => {
      await temp.lake.writeJson(`taxonomy/versions/${ID}/variants.manual.json`, { a: [variant("manual")] });

      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { variants: [] }) } });

      await expect(read(temp, "variants.manual")).resolves.toEqual({ a: [] });
    });

    it("clears the seeded variants of an item with no manual override", async () => {
      await saveDraft(temp.lake, ID, { items: { a: gggItem("a", { variants: [] }) } });

      await expect(read(temp, "variants.manual")).resolves.toEqual({ a: [] });
    });
  });

  describe("categories", () => {
    it("deletes a category saved as null and keeps the others", async () => {
      await saveDraft(temp.lake, ID, { categories: { maps: null } });

      await expect(read(temp, "categories")).resolves.toEqual({ currency: { conditions: [] } });
    });

    it("stores a chaos-tiered category with no tiering and drops empty lists", async () => {
      await saveDraft(temp.lake, ID, { categories: { gems: category("gems", { hints: [], samples: [], rejects: [], catchAll: false }) } });

      expect((await read(temp, "categories"))["gems"]).toEqual({ conditions: [] });
    });

    it("keeps a non-chaos tiering, a name, an order of zero and a catch-all", async () => {
      await saveDraft(temp.lake, ID, {
        categories: { gems: category("gems", { name: "Gems", tiering: "stack-size", order: 0, catchAll: true }) },
      });

      expect((await read(temp, "categories"))["gems"]).toEqual({
        conditions: [],
        name: "Gems",
        tiering: "stack-size",
        catchAll: true,
        order: 0,
      });
    });
  });
});
