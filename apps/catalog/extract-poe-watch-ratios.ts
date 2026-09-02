import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * The Currency Exchange as PoeWatch aggregates it: every item it trades, with a
 * volume-weighted mean over the last few hours and the volume behind it.
 *
 * **A sale price, where compact is a listing price.** For anything the exchange trades this
 * is the better number by far — compact reads a Divine Orb off a few dozen listings while
 * the exchange has tens of thousands of trades in the window — and silver takes it first.
 *
 * `game` is fixed: one API serves both games and league names collide across them.
 */
export const extractPoeWatchRatios: Step = {
  id: "poe-watch-ratios",
  stage: "bronze",

  async run({ lake, runId, league, poeWatch }) {
    const ratios = await poeWatch.getExchangeRatios(league, "poe1");
    const key = bronzeKey(runId, BRONZE_FILES.poeWatchRatios);

    await lake.writeJson(key, ratios);

    return { keys: [key], rows: ratios.length };
  },
};
