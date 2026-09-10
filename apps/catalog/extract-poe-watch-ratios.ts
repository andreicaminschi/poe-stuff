import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractPoeWatchRatios: Step = {
  id: "poe-watch-ratios",
  stage: "bronze",
  source: "poewatch",

  async run({ lake, runId, league, poeWatch }) {
    const ratios = await poeWatch.getExchangeRatios(league, "poe1");
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchRatios);

    await lake.writeJson(key, ratios);

    return { keys: [key], rows: ratios.length };
  },
};
