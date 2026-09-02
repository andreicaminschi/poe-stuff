import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { CurrencyExchange } from "@poe/ggg/types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { Essences } from "@poe/repoe/get-essences.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { applyAuthored } from "./build-silver/apply-authored.ts";
import { classifyItems } from "./build-silver/classify-items.ts";
import { fromExchange } from "./build-silver/from-exchange.ts";
import { fromGems } from "./build-silver/from-gems.ts";
import { fromGGGItems } from "./build-silver/from-ggg-items.ts";
import { fromPoeWatch } from "./build-silver/from-poe-watch.ts";
import { fromRepoe } from "./build-silver/from-repoe.ts";
import { groupByCategory } from "./build-silver/group-by-category.ts";
import { tagIds } from "./build-silver/tag-ids.ts";
import { withUniques } from "./build-silver/with-uniques.ts";
import { isAuthored, isFilterable, knownToRepoe } from "./item.ts";
import type { Item } from "./item.ts";
import { BRONZE_FILES, bronzeKey, silverKey, silverPrefix } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/** Where a row that could not be filed under a category goes. */
const UNRESOLVED_FILE = "unresolved.json";

/**
 * Bronze, merged into one row per item and written out a file per category.
 *
 * The order is the design. The trade site names what it will let you search for; the
 * exchange adds every metadata path that traded this hour; the game's own data fills last,
 * across four files — bases, gem variants, raisable monsters and essences — so it is the
 * last word on class, tags and release state. The taxonomy then decides where each row is
 * filed.
 *
 * Three artifacts come out, and every row is in exactly one of them. A category file holds
 * what the game and the taxonomy both know. `skipped.json` holds what the trade site lists
 * and the game's data does not name — a search label rather than an item on the ground.
 * `unresolved.json` holds what the taxonomy could not place.
 */
export const buildSilver: Step = {
  id: "build-silver",
  stage: "silver",

  async run({ lake, runId }) {
    const read = <T>(file: string) => lake.readJson<T>(bronzeKey(runId, file));

    const [
      groups,
      exchange,
      baseItems,
      gems,
      essences,
      taxonomy,
      listings,
      ratios,
      corruptions,
    ] = await Promise.all([
      read<readonly GGGItemGroup[]>(BRONZE_FILES.gggItems),
      read<CurrencyExchange>(BRONZE_FILES.currencyHour),
      read<BaseItems>(BRONZE_FILES.repoeBaseItems),
      read<Gems>(BRONZE_FILES.repoeGems),
      read<Essences>(BRONZE_FILES.repoeEssences),
      read<Taxonomy>(BRONZE_FILES.taxonomy),
      read<readonly ItemData[]>(BRONZE_FILES.poeWatchCompact),
      read<readonly ExchangeRatioItem[]>(BRONZE_FILES.poeWatchRatios),
      read<readonly ItemCorruptions[]>(BRONZE_FILES.poeWatchCorruptions),
    ]);

    /**
     * The game's own data builds the rows and gives each one its metadata id as a key; the
     * trade site and the exchange then say what can be bought. Order matters: nothing can be
     * marked tradable before there is a row to mark.
     */
    const merged = fromGGGItems(
      fromExchange(
        tagIds(
          fromGems(fromRepoe(baseItems), gems),
          Object.keys(essences),
          "repoe-essences",
        ),
        exchange.markets,
      ),
      groups,
    );

    const { classified, unresolved } = classifyItems(
      [...merged.values()],
      taxonomy,
    );

    // Last, and after the taxonomy on purpose: an authored row carries its own category, so
    // it is never looked up and cannot be reported as one the table failed to place.
    // Priced last of all, because only a filterable row is priced and nothing before this
    // point has finished deciding which rows those are. Then every base gets the uniques
    // that roll on it, each form priced — a unique is not a row, it is what a base can be.
    const rows = withUniques(
      fromPoeWatch(applyAuthored(classified, taxonomy.authored), listings, ratios),
      groups,
      listings,
      corruptions,
    );

    const kept: Item[] = [];
    const skipped: Item[] = [];
    for (const item of rows) {
      (knownToRepoe(item) || isAuthored(item) ? kept : skipped).push(item);
    }

    /**
     * A category is up to three files side by side — `currency.json`,
     * `currency.skipped.json` and `currency.tradable.json` — so what it kept, what it set
     * aside and what a player can actually sell are read together rather than by searching
     * one long file for a category name.
     *
     * **`.filterable.json` is a subset of `.json`, not a fourth pile.** Every row in it is
     * also in the category file; it is there so the rows a filter rule can be written for
     * are one file rather than a filter over one.
     *
     * **`.unpriced.json` is a subset of `.filterable.json`, the same way.** A row a filter
     * can name and PoeWatch does not price — a name the game no longer drops, most of the
     * time — is what a hand pass over the taxonomy goes looking for, so it is one file rather
     * than a search. A row with variants is not here: its variants carry the prices, and
     * one of them going unpriced is a form nobody lists, not a row nobody knows.
     */
    const filterable = kept.filter(isFilterable);
    const unpriced = filterable.filter(
      (item) => item.meanPrice === undefined && item.variants === undefined,
    );

    const files = [
      ...[...groupByCategory(kept)].map(
        ([category, rows]) => [`${category}.json`, rows] as const,
      ),
      ...[...groupByCategory(filterable)].map(
        ([category, rows]) => [`${category}.filterable.json`, rows] as const,
      ),
      ...[...groupByCategory(unpriced)].map(
        ([category, rows]) => [`${category}.unpriced.json`, rows] as const,
      ),
      ...[...groupByCategory(skipped)].map(
        ([category, rows]) => [`${category}.skipped.json`, rows] as const,
      ),
      [
        UNRESOLVED_FILE,
        [...unresolved].sort((a, b) => a.key.localeCompare(b.key)),
      ] as const,
    ].sort(([a], [b]) => a.localeCompare(b));

    // Rebuilt from scratch every run, so anything the run before it wrote goes first. A
    // category that has emptied since would otherwise leave a file sitting there looking
    // current.
    await lake.clear(silverPrefix(runId));

    const keys: string[] = [];

    for (const [file, rows] of files) {
      const key = silverKey(runId, file);
      await lake.writeJson(key, rows);
      keys.push(key);
    }

    return { keys, rows: kept.length };
  },
};
