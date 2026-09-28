import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { access, rm } from "node:fs/promises";
import { createLakeService } from "@poe/lake/service";
import { entry } from "../ledger/ledger.test-helpers.ts";
import { category, gggItem } from "../taxonomy/draft.test-helpers.ts";
import { seedDraft, tempLake, type TempLake } from "./temp-lake.test-helpers.ts";

type Result = { ok: boolean; log: string };
const runAction = jest.fn<(repo: string, args: readonly string[]) => Promise<Result>>();
jest.unstable_mockModule("./yarn.ts", () => ({ runAction, runQuery: jest.fn(), runYarn: jest.fn() }));

const { stageWorking, withPublishedWorking } = await import("./stage-working.ts");

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

  it("applies the ledger and then the unsaved edits, the unsaved edit winning on the same item", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [
      entry(1, { items: { a: gggItem("a", { name: "ledger" }) } }),
    ]);

    staged = await stageWorking(temp.lake, ID, { items: { a: gggItem("a", { name: "unsaved" }) } });

    const copy = createLakeService({ root: staged });
    await expect(copy.readJson(`taxonomy/versions/${ID}/items.json`)).resolves.toEqual({
      a: { name: "unsaved", category: "currency", subcategory: null },
    });
  }); // order matters: ledger commit first, edits over it

  it("leaves the staged copy's ledger empty once it has been applied", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [entry(1, { categories: { maps: category("maps") } })]);

    staged = await stageWorking(temp.lake, ID, {});

    const copy = createLakeService({ root: staged });
    await expect(copy.readJson(`admin-panel/ledger/${ID}.json`)).resolves.toEqual([]);
  }); // committing drains the copy, so nothing applies twice

  it("leaves the real lake's files and ledger untouched", async () => {
    await temp.lake.writeJson(`admin-panel/ledger/${ID}.json`, [entry(1, { categories: { maps: category("maps") } })]);

    staged = await stageWorking(temp.lake, ID, { categories: { currency: null } });

    await expect(temp.lake.readJson(`taxonomy/versions/${ID}/categories.json`)).resolves.toEqual({
      currency: { conditions: [] },
    });
    await expect(temp.lake.readJson(`admin-panel/ledger/${ID}.json`)).resolves.toHaveLength(1);
  }); // the real lake is only read

  it("stages a version with no ledger and no edits as a plain copy", async () => {
    staged = await stageWorking(temp.lake, ID, {});

    const copy = createLakeService({ root: staged });
    await expect(copy.exists(`admin-panel/ledger/${ID}.json`)).resolves.toBe(false);
    await expect(copy.readJson(`taxonomy/versions/${ID}/categories.json`)).resolves.toEqual({
      currency: { conditions: [] },
    });
  }); // absent keys are skipped, not written empty

  it("fails when there are edits for a version that is not the newest draft", async () => {
    const staging = stageWorking(temp.lake, "3.29.1", { items: {} });

    await expect(staging).rejects.toThrow("cannot be edited");
  }); // an empty items map still counts as edits

  it("stages without complaint when there are no edits, even for a version that is not editable", async () => {
    staged = await stageWorking(temp.lake, "3.29.1", {});

    await expect(access(staged)).resolves.toBeUndefined();
  }); // no ledger, no edits, no editability check
});

describe("withPublishedWorking", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    runAction.mockReset();
  });
  afterEach(() => temp.remove());

  it("publishes the staged draft into its throwaway lake and hands that lake to the work", async () => {
    await seedDraft(temp.lake, ID);
    runAction.mockResolvedValue({ ok: true, log: "" });

    const root = await withPublishedWorking("/repo", temp.lake, ID, {}, async (staged) => staged);

    expect(runAction).toHaveBeenCalledWith("/repo", ["taxonomy", "publish", ID, `--root=${root}`]);
  }); // --root keeps the publish out of the real lake

  it("removes the throwaway lake once the work is done", async () => {
    await seedDraft(temp.lake, ID);
    runAction.mockResolvedValue({ ok: true, log: "" });

    const root = await withPublishedWorking("/repo", temp.lake, ID, {}, async (staged) => staged);

    await expect(access(root)).rejects.toThrow();
  });

  it("throws the publish log and never runs the work when the draft does not publish", async () => {
    await seedDraft(temp.lake, ID);
    runAction.mockResolvedValue({ ok: false, log: "invalid row a" });
    const work = jest.fn(async (_root: string) => "done");

    const running = withPublishedWorking("/repo", temp.lake, ID, {}, work);

    await expect(running).rejects.toThrow("invalid row a");
    expect(work).not.toHaveBeenCalled();
  }); // publishing is the validation

  it("removes the throwaway lake when the work throws", async () => {
    await seedDraft(temp.lake, ID);
    runAction.mockResolvedValue({ ok: true, log: "" });
    let root = "";

    const running = withPublishedWorking("/repo", temp.lake, ID, {}, async (staged) => {
      root = staged;
      throw new Error("compile failed");
    });

    await expect(running).rejects.toThrow("compile failed");
    await expect(access(root)).rejects.toThrow();
  }); // cleanup lives in finally

  it("hands an already published version's merged files to the work without publishing again", async () => {
    await temp.lake.writeJson("taxonomy/registry.json", {
      next: 2,
      versions: { [ID]: { state: "published", createdAt: "2026-01-01T00:00:00Z" } },
    });
    await temp.lake.writeJson(`taxonomy/${ID}.json`, { rows: 1 });
    await temp.lake.writeJson(`taxonomy/${ID}.categories.json`, { cats: 1 });

    const copied = await withPublishedWorking("/repo", temp.lake, ID, {}, (staged) =>
      createLakeService({ root: staged }).readJson(`taxonomy/${ID}.json`));

    expect(copied).toEqual({ rows: 1 });
    expect(runAction).not.toHaveBeenCalled();
  }); // a published version has no draft files to stage
});
