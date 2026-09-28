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
    const ledger = await getLedger(temp.lake, "3.29.2");

    expect(ledger).toEqual([]);
  }); // missing file is normal, not an error

  it("reads only the named version's ledger, not another version's", async () => {
    await temp.lake.writeJson("admin-panel/ledger/3.29.1.json", [entry(1), entry(2)]);
    await temp.lake.writeJson("admin-panel/ledger/3.29.2.json", [entry(1)]);

    const ledger = await getLedger(temp.lake, "3.29.2");

    expect(ledger).toEqual([entry(1)]);
  }); // one file per version
});
