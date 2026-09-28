import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { getCatalog } from "./getCatalog.api.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "generator-catalog-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const row = {
  key: "Mirror",
  name: "Mirror of Kalandra",
  category: "Currency",
  subcategory: null,
  baseTypes: ["Mirror of Kalandra"],
};

describe("getCatalog", () => {
  it("reads the HC Allflame rows and category table from files named hc-allflame", async () => {
    await lake.writeJson("catalog/latest/hc-allflame.catalog.json", [row]);
    await lake.writeJson("catalog/latest/hc-allflame.catalog.categories.json", { Currency: { conditions: [] } });

    const catalog = await getCatalog(lake, "HC Allflame");

    expect(catalog).toEqual({ rows: [row], categories: { Currency: { conditions: [] } } });
  }); // the league name is slugged before it becomes a key

  it("fails when the rows were published but the category table never was", async () => {
    await lake.writeJson("catalog/latest/allflame.catalog.json", [row]);

    const reading = getCatalog(lake, "Allflame");

    await expect(reading).rejects.toThrow();
  }); // half a catalog is an error, not an empty table
});
