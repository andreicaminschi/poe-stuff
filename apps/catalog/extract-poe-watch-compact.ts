import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractPoeWatchCompact: Step = {
  id: "poe-watch-compact",
  stage: "bronze",
  source: "poewatch",

  async run({ lake, runId, league, poeWatch }) {
    const items = await poeWatch.getCompactData(league);
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchCompact);

    await lake.writeJson(key, items);

    return { keys: [key], rows: items.length };
  },
};
