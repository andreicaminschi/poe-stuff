import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { getCatalog } from "./catalog/getCatalog.api.ts";
import { getConfig } from "./config/getConfig.api.ts";
import { saveConfig } from "./config/saveConfig.api.ts";
import { saveFilter } from "./filter/saveFilter.api.ts";
import { LEAGUE, type GeneratorApi } from "./generator-api.ts";

export function createGeneratorService(repo: string, choosePath: () => Promise<string | undefined>): GeneratorApi {
  const lake = createLakeService({ root: join(repo, ".s3") });

  return {
    getCatalog: () => getCatalog(lake, LEAGUE),
    getConfig: () => getConfig(lake),
    saveConfig: (config) => saveConfig(lake, config),
    saveFilter: (text) => saveFilter(text, choosePath),
  };
}
