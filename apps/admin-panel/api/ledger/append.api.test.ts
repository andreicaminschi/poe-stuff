import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { appendLedger } from "./append.api.ts";
import { getLedger } from "./get.api.ts";
import { entry } from "./ledger.test-helpers.ts";

describe("appendLedger", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, "3.29.2");
  });
  afterEach(() => temp.remove());

  it("starts a ledger that does not exist yet at entry 1", async () => {
    await appendLedger(temp.lake, "3.29.2", entry(1));

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  }); // missing file counts as ending at 0

  it("adds entry 2 after entry 1, keeping entry 1", async () => {
    await appendLedger(temp.lake, "3.29.2", entry(1));

    await appendLedger(temp.lake, "3.29.2", entry(2));

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1), entry(2)]);
  });

  it.each([1, 3])("refuses entry %i when entry 2 is next, and leaves the ledger as it was", async (seq) => {
    await appendLedger(temp.lake, "3.29.2", entry(1));

    const appending = appendLedger(temp.lake, "3.29.2", entry(seq));

    await expect(appending).rejects.toThrow(`The ledger for 3.29.2 expected entry 2, got ${seq}. Reload the panel.`);
    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  }); // a replay and a skipped entry both mean a stale panel

  it("refuses entry 0 on an empty ledger", async () => {
    const appending = appendLedger(temp.lake, "3.29.2", entry(0));

    await expect(appending).rejects.toThrow("expected entry 1, got 0");
  }); // numbering starts at 1, not 0

  it("refuses to write to a version that is not the newest draft", async () => {
    const appending = appendLedger(temp.lake, "3.29.1", entry(1));

    await expect(appending).rejects.toThrow("cannot be edited");
    await expect(getLedger(temp.lake, "3.29.1")).resolves.toEqual([]);
  }); // checked before the sequence number
});
