import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * The game's own base item data, as RePoE unpacks it after a patch.
 *
 * The whole export in one request — there is no query and no partial fetch — and it is
 * re-downloaded every hour rather than shared between runs. That is the price of a replay
 * that classifies the way the original run did: RePoE re-exports whenever the game changes,
 * and a run that read a newer export is a different run.
 */
export const extractRepoeBaseItems: Step = {
  id: "repoe-base-items",
  stage: "bronze",

  async run({ lake, runId, repoe }) {
    const baseItems = await repoe.getBaseItems();
    const key = bronzeKey(runId, BRONZE_FILES.repoeBaseItems);

    await lake.writeJson(key, baseItems);

    return { keys: [key], rows: Object.keys(baseItems).length };
  },
};
