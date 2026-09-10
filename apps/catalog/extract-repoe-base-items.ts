import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractRepoeBaseItems: Step = {
  id: "repoe-base-items",
  stage: "bronze",
  source: "repoe",

  async run({ lake, runId, repoe }) {
    const baseItems = await repoe.getBaseItems();
    const key = bronzeKey(runId, BRONZE_FILES.repoeBaseItems);

    await lake.writeJson(key, baseItems);

    return { keys: [key], rows: Object.keys(baseItems).length };
  },
};
