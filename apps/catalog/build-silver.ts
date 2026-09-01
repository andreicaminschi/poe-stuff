import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { CurrencyExchange } from "@poe/ggg/types";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { classifyItems } from "./build-silver/classify-items.ts";
import { fromExchange } from "./build-silver/from-exchange.ts";
import { fromGGGItems } from "./build-silver/from-ggg-items.ts";
import { fromRepoe } from "./build-silver/from-repoe.ts";
import { groupByCategory } from "./build-silver/group-by-category.ts";
import { BRONZE_FILES, bronzeKey, silverKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/** Where a row that could not be filed under a category goes. */
const UNRESOLVED_FILE = "unresolved.json";

/**
 * Bronze, merged into one row per item and written out a file per category.
 *
 * The order is the design. The trade site names what it will let you search for; the
 * exchange adds every metadata path that traded this hour; RePoE fills last, so the game's
 * own export is the last word on class, tags and release state. The taxonomy then decides
 * where each row is filed, and anything it cannot place is written to `unresolved.json`
 * rather than dropped.
 *
 * Reads four bronze keys and writes only silver ones — the four files it reads are the same
 * bytes a replay reads, which is what makes rebuilding silver cost nothing.
 */
export const buildSilver: Step = {
  id: "build-silver",
  stage: "silver",

  async run({ lake, runId }) {
    const [groups, exchange, baseItems, taxonomy] = await Promise.all([
      lake.readJson<readonly GGGItemGroup[]>(
        bronzeKey(runId, BRONZE_FILES.gggItems),
      ),
      lake.readJson<CurrencyExchange>(
        bronzeKey(runId, BRONZE_FILES.currencyHour),
      ),
      lake.readJson<BaseItems>(bronzeKey(runId, BRONZE_FILES.repoeBaseItems)),
      lake.readJson<Taxonomy>(bronzeKey(runId, BRONZE_FILES.taxonomy)),
    ]);

    const merged = fromRepoe(
      fromExchange(fromGGGItems(groups), exchange.markets, baseItems),
      baseItems,
    );

    const { classified, unresolved } = classifyItems(
      [...merged.values()],
      taxonomy,
    );

    const files = groupByCategory(classified);
    const keys: string[] = [];

    for (const [file, rows] of [...files].sort()) {
      const key = silverKey(runId, file);
      await lake.writeJson(key, rows);
      keys.push(key);
    }

    const unresolvedKey = silverKey(runId, UNRESOLVED_FILE);
    await lake.writeJson(
      unresolvedKey,
      [...unresolved].sort((a, b) => a.key.localeCompare(b.key)),
    );

    return { keys: [...keys, unresolvedKey], rows: classified.length };
  },
};
