import type { Lake } from "@poe/lake/types";
import { configKey } from "../util/keys.ts";
import { DEFAULT_CONFIG } from "./default-config.ts";
import type { GeneratorConfig } from "./types.ts";

/** The saved config, or the defaults when nothing was saved yet. */
export async function getConfig(lake: Lake): Promise<GeneratorConfig> {
  if (!(await lake.exists(configKey()))) return DEFAULT_CONFIG;

  const saved = await lake.readJson<GeneratorConfig>(configKey());
  const categories = Object.fromEntries(
    Object.entries(saved.categories ?? {}).map(([key, one]) => [key, { ...DEFAULT_CONFIG.categories[key], ...one }]),
  );
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    floors: { ...DEFAULT_CONFIG.floors, ...saved.floors },
    categories: { ...DEFAULT_CONFIG.categories, ...categories },
  };
}
