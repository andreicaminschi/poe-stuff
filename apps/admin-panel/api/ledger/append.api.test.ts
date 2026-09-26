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

  it("starts an empty ledger at entry 1", async () => {
    await appendLedger(temp.lake, "3.29.2", entry(1));

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  });

  it("appends the entry after the last one", async () => {
    await appendLedger(temp.lake, "3.29.2", entry(1));
    await appendLedger(temp.lake, "3.29.2", entry(2));

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1), entry(2)]);
  });

  it.each([1, 3])("refuses entry %i when entry 2 is next, and writes nothing", async (seq) => {
    await appendLedger(temp.lake, "3.29.2", entry(1));

    await expect(appendLedger(temp.lake, "3.29.2", entry(seq))).rejects.toThrow(
      `The ledger for 3.29.2 expected entry 2, got ${seq}. Reload the panel.`,
    );
    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  });

  it("refuses a version that is not the newest draft", async () => {
    await expect(appendLedger(temp.lake, "3.29.1", entry(1))).rejects.toThrow("cannot be edited");
  });
});
