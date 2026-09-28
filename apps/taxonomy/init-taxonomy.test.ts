import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { initTaxonomy } from "./init-taxonomy.ts";
import { sourceKey } from "./lake.ts";
import { readRegistry } from "./registry.ts";

const items = { Ring: { name: "Ruby Ring", category: "rings", subcategory: null } };

describe("initTaxonomy", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-init-"));
    lake = createLakeService({ root });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("creates the first version as number one of the game version", async () => {
    expect(await initTaxonomy(lake, "3.29", items)).toBe("3.29.1");
  });

  it("writes the items and five empty tables", async () => {
    await initTaxonomy(lake, "3.29", items);

    expect(await lake.readJson(sourceKey("3.29.1", "items"))).toEqual(items);
    expect(await lake.readJson(sourceKey("3.29.1", "variants.manual"))).toEqual({});
  });

  it("records the version as a draft with no parent and moves the counter to two", async () => {
    await initTaxonomy(lake, "3.29", items);

    const registry = await readRegistry(lake);

    expect(registry.next).toBe(2);
    expect(registry.versions["3.29.1"]).toEqual({ state: "draft", createdAt: expect.any(String) });
  });

  it("refuses to run a second time", async () => {
    await initTaxonomy(lake, "3.29", items);

    await expect(initTaxonomy(lake, "3.29", items)).rejects.toThrow("Versions already exist");
  });

  it("refuses a game version that does not make a valid version", async () => {
    await expect(initTaxonomy(lake, "3", items)).rejects.toThrow("\"3.1\" is not a version");
  });
});
