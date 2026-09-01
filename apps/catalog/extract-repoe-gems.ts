import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * Every gem variant, from Path of Building's table on the RePoE site.
 *
 * `base_items.json` does not name a gem variant: a transfigured gem shares a metadata id
 * with the gem it comes from, and only this file gives each variant its own row and its
 * own name. Without it every transfigured gem looks like something the game's data has
 * never heard of.
 */
export const extractRepoeGems: Step = {
  id: "repoe-gems",
  stage: "bronze",

  async run({ lake, runId, repoe }) {
    const gems = await repoe.getGems();
    const key = bronzeKey(runId, BRONZE_FILES.repoeGems);

    await lake.writeJson(key, gems);

    return { keys: [key], rows: Object.keys(gems).length };
  },
};
