import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { createTaxonomy } from "./create-taxonomy.ts";
import { SOURCE_FILES, sourceKey } from "./lake.ts";
import { readRegistry, writeRegistry } from "./registry.ts";

const at = "2026-01-01T00:00:00.000Z";

describe("createTaxonomy", () => {
  let root: string;
  let lake: Lake;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "taxonomy-create-"));
    lake = createLakeService({ root });
    for (const file of SOURCE_FILES) await lake.writeJson(sourceKey("3.29.1", file), { file });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("copies every file of the published parent into the new version", async () => {
    await writeRegistry(lake, { next: 2, versions: { "3.29.1": { state: "published", createdAt: at } } });

    const version = await createTaxonomy(lake, "3.29.1");

    expect(version).toBe("3.29.2");
    expect(await lake.readJson(sourceKey("3.29.2", "authored.manual"))).toEqual({ file: "authored.manual" });
  });

  it("records the new version as a draft that names its parent", async () => {
    await writeRegistry(lake, { next: 2, versions: { "3.29.1": { state: "published", createdAt: at } } });

    await createTaxonomy(lake, "3.29.1");

    const registry = await readRegistry(lake);
    expect(registry.next).toBe(3);
    expect(registry.versions["3.29.2"]).toEqual({ state: "draft", parent: "3.29.1", createdAt: expect.any(String) });
  });

  it("refuses to start from a draft and writes nothing", async () => {
    await writeRegistry(lake, { next: 2, versions: { "3.29.1": { state: "draft", createdAt: at } } });

    await expect(createTaxonomy(lake, "3.29.1")).rejects.toThrow("is a draft");
    expect(await lake.exists(sourceKey("3.29.2", "items"))).toBe(false);
  });

  it("numbers off the counter, so an older parent still gets the next number", async () => {
    await writeRegistry(lake, {
      next: 5,
      versions: {
        "3.29.1": { state: "published", createdAt: at },
        "3.29.4": { state: "published", createdAt: at },
      },
    });

    expect(await createTaxonomy(lake, "3.29.1")).toBe("3.29.5");
  });
});
