import { compileFilter as writeFilter, type CompileRow } from "@poe/filter-compile/compile-filter";
import type { CategoryRecords } from "@poe/filter-compile/resolve-row";
import type { FilterItem } from "@poe/filter-eval/filter-ast";
import { compileFilter } from "@poe/filter-eval/match-filter";
import { parseFilter } from "@poe/filter-eval/parse-filter";
import { buildSamples } from "@poe/filter-validate/build-samples";
import { formatPath } from "@poe/filter-validate/format-path";
import type { SampleCategories, SampleRow } from "@poe/filter-validate/types";
import { findBlockEntries } from "./build-eval-cases/find-block-entries.ts";
import { findUniqueEntries } from "./build-eval-cases/find-unique-entries.ts";
import type { EntryRow, MarketEntry } from "./build-eval-cases/types.ts";

/** What `buildEvalCases` reads off a catalog row. */
export type EvalRow = CompileRow & EntryRow;

/** One test item and the market entries a correct classifier answers with. */
export type EvalCase = {
  readonly item: FilterItem;
  readonly expected: readonly MarketEntry[];
};

/** One item two taxonomy rows both build: a generation error. */
export type EvalOverlap = {
  readonly item: FilterItem;
  readonly rows: readonly [string, string];
  readonly paths: readonly [string, string];
};

/** The classifier's test set, and the overlaps found while building it. */
export type EvalCases = {
  readonly cases: readonly EvalCase[];
  readonly overlaps: readonly EvalOverlap[];
};

/**
 * Generates test items with their expected market entries, for testing the item classifier.
 * A unique item is answered by its base's unique listings, and any other item by the
 * compiled filter. Reject samples are skipped. Each distinct item gets one case.
 * An item a second row also builds, on the same path or another, is reported in `overlaps`,
 * since two rows claiming one item is a taxonomy error.
 *
 * @example
 * // rows: "Ruby Ring" on rings/any, and "Ruby Ring B" on rings/any with the same base
 * // sample set on rings/any: { Class: Rings, BaseType: from baseTypes, Rarity: Rare }
 * buildEvalCases(rows, categories);
 * // → {
 * //   cases: [{ item: { Class: "Rings", BaseType: "Ruby Ring", Rarity: "Rare" },
 * //             expected: [{ source: "poeWatch:items", id: 7, name: "Ruby Ring" }] }],
 * //   overlaps: [{ item: { Class: "Rings", BaseType: "Ruby Ring", Rarity: "Rare" },
 * //                rows: ["Ruby Ring", "Ruby Ring B"], paths: ["rings/any", "rings/any"] }],
 * // }
 */
export function buildEvalCases(
  rows: readonly EvalRow[],
  categories: SampleCategories & CategoryRecords,
): EvalCases {
  const filterText = writeFilter(rows, categories).text;
  const filterMatcher = compileFilter(parseFilter(filterText));

  const rowsByKey = new Map(rows.map((row) => [row.key, row]));
  const uniqueBasesByName = new Map(rows.filter((row) => row.uniques !== undefined).map((row) => [row.name, row]));

  const findExpectedEntries = (item: FilterItem): readonly MarketEntry[] =>
    item.Rarity === "Unique"
      ? findUniqueEntries(item, uniqueBasesByName)
      : findBlockEntries(item, filterMatcher, rowsByKey);

  const claimedRowByItem = new Map<string, SampleRow>();
  const cases: EvalCase[] = [];
  const overlaps: EvalOverlap[] = [];

  for (const { row, item, reject } of buildSamples(rows, categories)) {
    if (reject !== undefined) continue;
    const itemKey = JSON.stringify(item);
    const claimedRow = claimedRowByItem.get(itemKey);

    if (claimedRow === undefined) {
      claimedRowByItem.set(itemKey, row);
      cases.push({ item, expected: findExpectedEntries(item) });
    } else {
      overlaps.push({
        item,
        rows: [claimedRow.key, row.key],
        paths: [formatPath(claimedRow), formatPath(row)],
      });
    }
  }
  return { cases, overlaps };
}
