import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractCurrencyHour: Step = {
  id: "currency-hour",
  stage: "bronze",
  source: "ggg",

  async run({ lake, runId, league, hourId, ggg }) {
    const digest = await ggg.fetchCurrencyHour(hourId, { league });
    const key = bronzeKey(runId, BRONZE_FILES.currencyHour);

    await lake.writeJson(key, digest);

    return { keys: [key], rows: digest.markets.length };
  },
};
