import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { DEFAULT_CONFIG } from "./default-config.ts";
import { getConfig } from "./getConfig.api.ts";
import { saveConfig } from "./saveConfig.api.ts";
import type { GeneratorConfig } from "./types.ts";

let root: string;
let lake: Lake;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "generator-config-"));
  lake = createLakeService({ root });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const floors = { T0: 9, T1: 8, T2: 7, T3: 6, T4: 5, T5: 4 };

describe("getConfig", () => {
  it("answers with the defaults when nothing was saved yet", async () => {
    const config = await getConfig(lake);

    expect(config).toBe(DEFAULT_CONFIG);
  }); // checks existence first rather than catching a read error

  it("keeps the saved global floors", async () => {
    await lake.writeJson("generator/config.json", { floors, categories: {} });

    const config = await getConfig(lake);

    expect(config.floors).toEqual(floors);
  }); // saved values beat defaults

  it("fills a floor the saved file leaves out from the default floors", async () => {
    await lake.writeJson("generator/config.json", { floors: { T0: 999 }, categories: {} });

    const config = await getConfig(lake);

    expect(config.floors).toEqual({ ...DEFAULT_CONFIG.floors, T0: 999 });
  }); // floors merge key by key, not replace whole

  it("fills in the default categories a saved file with no categories never mentions", async () => {
    await lake.writeJson("generator/config.json", { floors });

    const config = await getConfig(lake);

    expect(config.categories).toEqual(DEFAULT_CONFIG.categories);
  }); // `saved.categories ?? {}` guards an older file

  it("merges a saved Gold over its default so Gold keeps its stack floors", async () => {
    const gold = { palette: { primary: "#000000", secondary: "#ffffff", icon: "Star" }, disabled: [], wanted: [] };
    await lake.writeJson("generator/config.json", { floors, categories: { Gold: gold } });

    const config = await getConfig(lake);

    expect(config.categories.Gold).toEqual({ ...DEFAULT_CONFIG.categories.Gold, ...gold });
  }); // per-category merge, not whole-category replace

  it("keeps a saved category the defaults do not know", async () => {
    const extra = { palette: { primary: "#111111", secondary: "#222222", icon: "Moon" }, disabled: ["T5"], wanted: ["x"] };
    await lake.writeJson("generator/config.json", { floors, categories: { extra } });

    const config = await getConfig(lake);

    expect(config.categories.extra).toEqual(extra);
  }); // spreading an undefined default is harmless
});

describe("saveConfig", () => {
  it("writes a config that reads back unchanged", async () => {
    const config: GeneratorConfig = { floors, categories: DEFAULT_CONFIG.categories };

    await saveConfig(lake, config);

    expect(await getConfig(lake)).toEqual(config);
  }); // round trip through the same key
});
