import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * One hour of the Currency Exchange, trimmed to the league being collected.
 *
 * The hour carries every league in one payload and the CDN takes no query, so the trim
 * happens after the download either way — asking for the league here is what keeps the
 * other leagues out of bronze rather than out of the request.
 *
 * A market names both of its sides by metadata id and says nothing about what kind of item
 * either one is. Turning those into names and subcategories is RePoE's job, in silver.
 */
export const extractCurrencyHour: Step = {
  id: "currency-hour",
  stage: "bronze",

  async run({ lake, runId, league, hourId, ggg }) {
    const digest = await ggg.fetchCurrencyHour(hourId, { league });
    const key = bronzeKey(runId, BRONZE_FILES.currencyHour);

    await lake.writeJson(key, digest);

    return { keys: [key], rows: digest.markets.length };
  },
};
