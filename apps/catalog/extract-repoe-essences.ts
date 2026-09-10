import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractRepoeEssences: Step = {
  id: "repoe-essences",
  stage: "bronze",
  source: "repoe",

  async run({ lake, runId, repoe }) {
    const essences = await repoe.getEssences();
    const key = bronzeKey(runId, BRONZE_FILES.repoeEssences);

    await lake.writeJson(key, essences);

    return { keys: [key], rows: Object.keys(essences).length };
  },
};
