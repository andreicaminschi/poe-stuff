import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { seedDraft, tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { getLedger } from "./get.api.ts";
import { entry } from "./ledger.test-helpers.ts";
import { popLedger } from "./pop.api.ts";

describe("popLedger", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
    await seedDraft(temp.lake, "3.29.2");
  });
  afterEach(() => temp.remove());

  it("removes entry 2 from a two-entry ledger when the caller names entry 2", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1), entry(2)]);

    await popLedger(temp.lake, "3.29.2", 2);

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  });

  it("empties a ledger holding only entry 1", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1)]);

    await popLedger(temp.lake, "3.29.2", 1);

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([]);
  });

  it("refuses to remove entry 1 when entry 2 is last, and keeps both", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1), entry(2)]);

    const popping = popLedger(temp.lake, "3.29.2", 1);

    await expect(popping).rejects.toThrow("The ledger for 3.29.2 ends at 2, not 1. Reload the panel.");
    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1), entry(2)]);
  }); // undo only ever takes the last entry

  it("says the ledger ends at nothing when it is empty", async () => {
    const popping = popLedger(temp.lake, "3.29.2", 1);

    await expect(popping).rejects.toThrow("ends at nothing, not 1");
  }); // no last entry reads as nothing, not undefined

  it("refuses a version that is not the newest draft", async () => {
    const popping = popLedger(temp.lake, "3.29.1", 1);

    await expect(popping).rejects.toThrow("cannot be edited");
  });
});
