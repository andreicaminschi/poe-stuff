import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractRepoeGems: Step = {
  id: "repoe-gems",
  stage: "bronze",
  source: "repoe",

  async run({ lake, runId, repoe }) {
    const gems = await repoe.getGems();
    const key = bronzeKey(runId, BRONZE_FILES.repoeGems);

    await lake.writeJson(key, gems);

    return { keys: [key], rows: Object.keys(gems).length };
  },
};
