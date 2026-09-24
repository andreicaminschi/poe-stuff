import type { Lake } from "@poe/lake/types";
import { configKey } from "../util/keys.ts";
import type { GeneratorConfig } from "./types.ts";

export const saveConfig = (lake: Lake, config: GeneratorConfig): Promise<void> =>
  lake.writeJsonAtomic(configKey(), config);
