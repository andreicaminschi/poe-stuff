import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractPoeWatchCorruptions: Step = {
  id: "poe-watch-corruptions",
  stage: "bronze",
  source: "poewatch",

  async run({ lake, runId, league, poeWatch }) {
    const corruptions = await poeWatch.getCorruptionData(league);
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchCorruptions);

    await lake.writeJson(key, corruptions);

    return { keys: [key], rows: corruptions.length };
  },
};
