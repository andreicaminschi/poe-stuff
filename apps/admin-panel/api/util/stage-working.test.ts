import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { access, rm } from "node:fs/promises";
import { createLakeService } from "@poe/lake/service";
import { entry } from "../ledger/ledger.test-helpers.ts";
import { category, gggItem } from "../taxonomy/draft.test-helpers.ts";
import { stageWorking } from "./stage-working.ts";
import { seedDraft, tempLake, type TempLake } from "./temp-lake.test-helpers.ts";

const ID = "3.29.2";

describe("stageWorking", () => {
  let temp: TempLake;
  let staged: string | undefined;
  beforeEach(async () => {
    temp = await tempLake();
    staged = undefined;
    await seedDraft(temp.lake, ID, {
      items: { a: { name: "a", category: "currency", subcategory: null } },
      categories: { currency: { conditions: [] } },
    });
  });
  afterEach(async () => {
    if (staged !== undefined) await rm(staged, { recursive: true, force: true });
    await temp.remove();
  });

  it("copies the draft, applies the ledger and then the unsaved edits, the edits winning", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [
      entry(1, { items: { a: gggItem("a", { name: "ledger" }) } }),
    ]);

    staged = await stageWorking(temp.lake, ID, { items: { a: gggItem("a", { name: "unsaved" }) } });

    const copy = createLakeService({ root: staged });
    await expect(copy.readJson(`taxonomy/versions/${ID}/items.json`)).resolves.toEqual({
      a: { name: "unsaved", category: "currency", subcategory: null },
    });
    await expect(copy.readJson(`admin-panel/ledger/${ID}.json`)).resolves.toEqual([]);
  });

  it("leaves the real lake's files and ledger untouched", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [entry(1, { categories: { maps: category("maps") } })]);

    staged = await stageWorking(temp.lake, ID, { categories: { currency: null } });

    await expect(temp.lake.readJson(`taxonomy/versions/${ID}/categories.json`)).resolves.toEqual({
      currency: { conditions: [] },
    });
    await expect(temp.lake.readJson(`admin-panel/ledger/${ID}.json`)).resolves.toHaveLength(1);
  });

  it("stages a version with no ledger and no edits as a plain copy", async () => {
    staged = await stageWorking(temp.lake, ID, {});

    const copy = createLakeService({ root: staged });
    await expect(copy.exists(`admin-panel/ledger/${ID}.json`)).resolves.toBe(false);
    await expect(copy.readJson(`taxonomy/versions/${ID}/categories.json`)).resolves.toEqual({
      currency: { conditions: [] },
    });
  });

  it("fails when the edits target a version that is not the newest draft", async () => {
    await expect(stageWorking(temp.lake, "3.29.1", { items: {} })).rejects.toThrow("cannot be edited");
  });

  it("stages without complaint when there are no edits, even for a version that is not editable", async () => {
    staged = await stageWorking(temp.lake, "3.29.1", {});

    await expect(access(staged)).resolves.toBeUndefined();
  }); // no ledger, no edits, no editability check
});
