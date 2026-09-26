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

const row = { key: "Mirror", name: "Mirror of Kalandra", category: "Currency", subcategory: null, baseTypes: ["Mirror of Kalandra"] };

describe("getCatalog", () => {
  it("reads the league's rows and category table from the slugged keys", async () => {
    await lake.writeJson("catalog/latest/hc-allflame.catalog.json", [row]);
    await lake.writeJson("catalog/latest/hc-allflame.catalog.categories.json", { Currency: { conditions: [] } });

    expect(await getCatalog(lake, "HC Allflame")).toEqual({ rows: [row], categories: { Currency: { conditions: [] } } });
  });

  it("rejects when the category table was never published", async () => {
    await lake.writeJson("catalog/latest/allflame.catalog.json", [row]);

    await expect(getCatalog(lake, "Allflame")).rejects.toThrow();
  });
});
