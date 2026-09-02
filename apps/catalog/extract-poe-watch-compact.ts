import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * Every priced item in the league, from PoeWatch.
 *
 * **A listing price, not a sale price.** PoeWatch scrapes what people are asking, so a row
 * here says what an item was offered at rather than what anybody paid. The whole league is
 * one call and there is no way to ask for less, so the trim other sources need does not
 * apply — what comes back is what is stored.
 */
export const extractPoeWatchCompact: Step = {
  id: "poe-watch-compact",
  stage: "bronze",

  async run({ lake, runId, league, poeWatch }) {
    const items = await poeWatch.getCompactData(league);
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchCompact);

    await lake.writeJson(key, items);

    return { keys: [key], rows: items.length };
  },
};
