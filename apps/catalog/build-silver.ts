import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { fromPoeWatch } from "./build-silver/from-poe-watch.ts";
import { fromTaxonomy } from "./build-silver/from-taxonomy.ts";
import { groupByCategory } from "./build-silver/group-by-category.ts";
import { withUniques } from "./build-silver/with-uniques.ts";
import { BRONZE_FILES, bronzeKey, silverKey, silverPrefix } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const UNPRICED = ".unpriced.json";

/**
 * The taxonomy's drawable rows, priced, with their uniques, written a file per category.
 *
 * **The taxonomy is the source of truth for which rows exist.** This step invents none and
 * judges none: it takes the published taxonomy's drawable rows, prices each off PoeWatch,
 * and hangs every unique that rolls on a base off that base.
 *
 * A category is up to two files: `currency.json`, every row, and `currency.unpriced.json`,
 * the rows PoeWatch has no price for. The second is a subset of the first. A row with variants
 * is never unpriced itself: its variants carry the prices.
 */
export const buildSilver: Step = {
  id: "build-silver",
  stage: "silver",

  async run({ lake, runId }) {
    const read = <T>(file: string) => lake.readJson<T>(bronzeKey(runId, file));

    const [groups, taxonomy, listings, ratios, corruptions] = await Promise.all([
      read<readonly GGGItemGroup[]>(BRONZE_FILES.gggItems),
      read<Taxonomy>(BRONZE_FILES.taxonomy),
      read<readonly ItemData[]>(BRONZE_FILES.poeWatchCompact),
      read<readonly ExchangeRatioItem[]>(BRONZE_FILES.poeWatchRatios),
      read<readonly ItemCorruptions[]>(BRONZE_FILES.poeWatchCorruptions),
    ]);

    const rows = withUniques(
      fromPoeWatch(fromTaxonomy(taxonomy), listings, ratios),
      groups,
      listings,
      corruptions,
    );

    const unpriced = rows.filter((item) => item.meanPrice === undefined && item.variants === undefined);

    const files = [
      ...[...groupByCategory(rows)].map(([category, rows]) => [`${category}.json`, rows] as const),
      ...[...groupByCategory(unpriced)].map(([category, rows]) => [`${category}${UNPRICED}`, rows] as const),
    ].sort(([a], [b]) => a.localeCompare(b));

    // Rebuilt every run, so an emptied category's old file goes.
    await lake.clear(silverPrefix(runId));

    const keys: string[] = [];

    for (const [file, rows] of files) {
      const key = silverKey(runId, file);
      await lake.writeJson(key, rows);
      keys.push(key);
    }

    return { keys, rows: rows.length };
  },
};
