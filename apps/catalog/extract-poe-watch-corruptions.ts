import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * What each corrupted implicit is worth, from PoeWatch.
 *
 * Rows are keyed by `item_id`, which is the `id` the compact dump uses — the two are
 * separate snapshots taken at separate moments, so an id here does not always resolve
 * there. Only the four categories that roll implicits appear at all.
 *
 * `rows` counts items with outcomes, not the outcomes themselves: one item carries many.
 */
export const extractPoeWatchCorruptions: Step = {
  id: "poe-watch-corruptions",
  stage: "bronze",

  async run({ lake, runId, league, poeWatch }) {
    const corruptions = await poeWatch.getCorruptionData(league);
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchCorruptions);

    await lake.writeJson(key, corruptions);

    return { keys: [key], rows: corruptions.length };
  },
};
