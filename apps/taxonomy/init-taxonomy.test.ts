import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { initTaxonomy } from "./init-taxonomy.ts";
import { SOURCE_FILES, sourceKey } from "./lake.ts";
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

  it("names the first version of game 3.29 as 3.29.1", async () => {
    const version = await initTaxonomy(lake, "3.29", items);

    expect(version).toBe("3.29.1");
  });

  it("writes the given items and leaves the other five tables empty", async () => {
    await initTaxonomy(lake, "3.29", items);

    expect(await lake.readJson(sourceKey("3.29.1", "items"))).toEqual(items);
    for (const file of SOURCE_FILES.filter((one) => one !== "items")) {
      expect(await lake.readJson(sourceKey("3.29.1", file))).toEqual({});
    }
  });

  it("records the version as a draft with no parent and moves the counter to two", async () => {
    await initTaxonomy(lake, "3.29", items);

    const registry = await readRegistry(lake);

    expect(registry.next).toBe(2);
    expect(registry.versions["3.29.1"]).toEqual({ state: "draft", createdAt: expect.any(String) });
  });

  it("refuses to run a second time once any version exists", async () => {
    await initTaxonomy(lake, "3.29", items);

    await expect(initTaxonomy(lake, "3.29", items)).rejects.toThrow("Versions already exist");
  }); // would otherwise wipe the registry down to one entry

  it("refuses a one-part game version before writing any file", async () => {
    await expect(initTaxonomy(lake, "3", items)).rejects.toThrow("\"3.1\" is not a version");

    expect(await lake.exists(sourceKey("3.1", "items"))).toBe(false);
  }); // the joined "3.1" is validated, not the input
});
