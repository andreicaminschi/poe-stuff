import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { tempLake, type TempLake } from "../util/temp-lake.test-helpers.ts";
import { getLedger } from "./get.api.ts";
import { entry } from "./ledger.test-helpers.ts";

describe("getLedger", () => {
  let temp: TempLake;
  beforeEach(async () => {
    temp = await tempLake();
  });
  afterEach(() => temp.remove());

  it("answers with an empty ledger when the version has none on disk", async () => {
    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([]);
  });

  it("reads the version's own ledger", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1)]);

    await expect(getLedger(temp.lake, "3.29.2")).resolves.toEqual([entry(1)]);
  });
});
