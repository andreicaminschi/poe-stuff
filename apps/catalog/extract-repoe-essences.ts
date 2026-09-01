import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * Every essence, from Path of Building's table on the RePoE site.
 *
 * Keyed by the currency metadata id, so the rows it names are ones `base_items.json`
 * already knows. What it adds is the tier and the mod each one forces.
 */
export const extractRepoeEssences: Step = {
  id: "repoe-essences",
  stage: "bronze",

  async run({ lake, runId, repoe }) {
    const essences = await repoe.getEssences();
    const key = bronzeKey(runId, BRONZE_FILES.repoeEssences);

    await lake.writeJson(key, essences);

    return { keys: [key], rows: Object.keys(essences).length };
  },
};
