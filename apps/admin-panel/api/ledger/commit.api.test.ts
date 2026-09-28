import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { authoredItem, category, gggItem } from "../taxonomy/draft.test-helpers.ts";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { commitLedger } from "./commit.api.ts";
import { getLedger } from "./get.api.ts";
import { entry } from "./ledger.test-helpers.ts";

const ID = "3.29.2";
const ARCHIVE = `admin-panel/ledger/${ID}.published.json`;

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
  });

  it("writes every entry into the draft, the later entry winning on the same key", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [
      entry(1, { items: { a: gggItem("a", { name: "first" }) } }),
      entry(2, { items: { a: gggItem("a", { name: "second" }) } }),
    ]);

    await commitLedger(temp.lake, ID);

    const items = await temp.lake.readJson<Record<string, { name: string }>>(`taxonomy/versions/${ID}/items.json`);
    expect(items["a"]?.name).toBe("second");
  });

  it("keeps a category deletion from an earlier entry when a later entry edits other categories", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [
      entry(1, { categories: { currency: null } }),
      entry(2, { categories: { maps: category("maps") } }),
    ]);

    await commitLedger(temp.lake, ID);

    const categories = await temp.lake.readJson<object>(`taxonomy/versions/${ID}/categories.json`);
    expect(Object.keys(categories)).toEqual(["maps"]);
  });

  it("empties the ledger and appends its entries to the archive of earlier commits", async () => {
    await temp.lake.writeJson(ARCHIVE, [entry(1)]);
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [entry(1, { items: { u: authoredItem("u") } })]);

    await commitLedger(temp.lake, ID);

    await expect(getLedger(temp.lake, ID)).resolves.toEqual([]);
    await expect(temp.lake.readJson(ARCHIVE)).resolves.toEqual([
      entry(1),
      entry(1, { items: { u: authoredItem("u") } }),
    ]);
  });

  it("refuses to commit a version that is not the newest draft and keeps its ledger", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/3.29.1.json`, [entry(1)]);

    await expect(commitLedger(temp.lake, "3.29.1")).rejects.toThrow("cannot be edited");
    await expect(getLedger(temp.lake, "3.29.1")).resolves.toEqual([entry(1)]);
  });
});
