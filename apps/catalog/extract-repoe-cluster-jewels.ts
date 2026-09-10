import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractRepoeClusterJewels: Step = {
  id: "repoe-cluster-jewels",
  stage: "bronze",
  source: "repoe",

  async run({ lake, runId, repoe }) {
    const jewels = await repoe.getClusterJewels();
    const key = bronzeKey(runId, BRONZE_FILES.repoeClusterJewels);

    await lake.writeJson(key, jewels);

    return { keys: [key], rows: Object.keys(jewels).length };
  },
};
