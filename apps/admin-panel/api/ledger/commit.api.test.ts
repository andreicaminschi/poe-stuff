import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { authoredItem, category, gggItem } from "../taxonomy/draft.test-helpers.ts";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { commitLedger } from "./commit.api.ts";
import { getLedger } from "./get.api.ts";
import { entry } from "./ledger.test-helpers.ts";

const ID = "3.29.2";
const ARCHIVE = `admin-panel/ledger/${ID}.published.json`;
const LEDGER = `admin-panel/ledger/${ID}.json`;

describe("commitLedger", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, ID, {
      items: { a: { name: "a", category: "currency", subcategory: null } },
      categories: { currency: { conditions: [] } },
    });
  });
  afterEach(() => temp.remove());

  it("does nothing, not even an archive, when the ledger is empty", async () => {
    await commitLedger(temp.lake, ID);

    await expect(temp.lake.exists(ARCHIVE)).resolves.toBe(false);
  }); // returns before the editability check too

  it("writes every entry into the draft, the later of two entries winning on the same item", async () => {
    await temp.lake.writeJson(LEDGER, [
      entry(1, { items: { a: gggItem("a", { name: "first" }) } }),
      entry(2, { items: { a: gggItem("a", { name: "second" }) } }),
    ]);

    await commitLedger(temp.lake, ID);

    const items = await temp.lake.readJson<Record<string, { name: string }>>(`taxonomy/versions/${ID}/items.json`);
    expect(items["a"]?.name).toBe("second");
  });

  it("keeps a category deletion from an earlier entry when a later entry edits another category", async () => {
    await temp.lake.writeJson(LEDGER, [
      entry(1, { categories: { currency: null } }),
      entry(2, { categories: { maps: category("maps") } }),
    ]);

    await commitLedger(temp.lake, ID);

    const categories = await temp.lake.readJson<object>(`taxonomy/versions/${ID}/categories.json`);
    expect(Object.keys(categories)).toEqual(["maps"]);
  }); // the null survives the merge as a delete

  it("keeps item edits from one entry and category edits from another", async () => {
    await temp.lake.writeJson(LEDGER, [
      entry(1, { items: { a: gggItem("a", { name: "renamed" }) } }),
      entry(2, { categories: { maps: category("maps") } }),
    ]);

    await commitLedger(temp.lake, ID);

    const items = await temp.lake.readJson<Record<string, { name: string }>>(`taxonomy/versions/${ID}/items.json`);
    const categories = await temp.lake.readJson<object>(`taxonomy/versions/${ID}/categories.json`);
    expect(items["a"]?.name).toBe("renamed");
    expect(Object.keys(categories)).toEqual(["currency", "maps"]);
  }); // a later entry without items must not drop earlier items

  it("empties the ledger once it is committed", async () => {
    await temp.lake.writeJson(LEDGER, [entry(1, { items: { u: authoredItem("u") } })]);

    await commitLedger(temp.lake, ID);

    await expect(getLedger(temp.lake, ID)).resolves.toEqual([]);
  });

  it("appends the committed entries after those already archived by earlier commits", async () => {
    await temp.lake.writeJson(ARCHIVE, [entry(1)]);
    await temp.lake.writeJson(LEDGER, [entry(1, { items: { u: authoredItem("u") } })]);

    await commitLedger(temp.lake, ID);

    await expect(temp.lake.readJson(ARCHIVE)).resolves.toEqual([
      entry(1),
      entry(1, { items: { u: authoredItem("u") } }),
    ]);
  }); // the archive grows; it is never replaced

  it("refuses to commit a version that is not the newest draft and keeps its ledger", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/3.29.1.json`, [entry(1)]);

    const committing = commitLedger(temp.lake, "3.29.1");

    await expect(committing).rejects.toThrow("cannot be edited");
    await expect(getLedger(temp.lake, "3.29.1")).resolves.toEqual([entry(1)]);
  }); // the draft save throws before the ledger is cleared
});
