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
    expect(await getConfig(lake)).toBe(DEFAULT_CONFIG);
  });

  it("keeps the saved global floors", async () => {
    await lake.writeJson("generator/config.json", { floors, categories: {} });

    expect((await getConfig(lake)).floors).toEqual(floors);
  });

  it("fills in default categories the saved config never mentions", async () => {
    await lake.writeJson("generator/config.json", { floors, categories: {} });

    expect((await getConfig(lake)).categories).toEqual(DEFAULT_CONFIG.categories);
  });

  it("merges a saved category over its default, keeping Gold's stack floors", async () => {
    const gold = { palette: { primary: "#000000", secondary: "#ffffff", icon: "Star" }, disabled: [], wanted: [] };
    await lake.writeJson("generator/config.json", { floors, categories: { Gold: gold } });

    expect((await getConfig(lake)).categories.Gold).toEqual({ ...DEFAULT_CONFIG.categories.Gold, ...gold });
  });

  it("keeps a saved category the defaults do not know", async () => {
    const extra = {
      palette: { primary: "#111111", secondary: "#222222", icon: "Moon" },
      disabled: ["T5"],
      wanted: ["x"],
    };
    await lake.writeJson("generator/config.json", { floors, categories: { extra } });

    expect((await getConfig(lake)).categories.extra).toEqual(extra);
  });
});

describe("saveConfig", () => {
  it("writes a config that reads back unchanged", async () => {
    const config: GeneratorConfig = { floors, categories: DEFAULT_CONFIG.categories };

    await saveConfig(lake, config);

    expect(await getConfig(lake)).toEqual(config);
  });
});
