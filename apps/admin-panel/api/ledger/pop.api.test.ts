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

  it("removes the last entry when the caller names it", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1), entry(2)]);

    await popLedger(temp.lake, "3.29.2", 2);

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  });

  it("refuses to remove an entry that is not the last one", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1), entry(2)]);

    await expect(popLedger(temp.lake, "3.29.2", 1)).rejects.toThrow(
      "The ledger for 3.29.2 ends at 2, not 1. Reload the panel.",
    );
  });

  it("says the ledger ends at nothing when it is empty", async () => {
    await expect(popLedger(temp.lake, "3.29.2", 1)).rejects.toThrow("ends at nothing, not 1");
  });

  it("refuses a version that is not the newest draft", async () => {
    await expect(popLedger(temp.lake, "3.29.1", 1)).rejects.toThrow("cannot be edited");
  });
});
