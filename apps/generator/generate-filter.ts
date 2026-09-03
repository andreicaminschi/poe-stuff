import { classifyRow } from "./generate-filter/classify-row.ts";
import { mergeBlocks } from "./generate-filter/merge-blocks.ts";
import { orderBlocks } from "./generate-filter/order-blocks.ts";
import { renderBlock } from "./generate-filter/render.ts";
import { byFloor } from "./generate-filter/tier-of.ts";
import type { Config, Decision, Skipped } from "./generate-filter/types.ts";
import type { CatalogRow, Categories } from "./resolve-conditions.ts";

export type Generated = {
  readonly text: string;
  readonly blocks: number;
  readonly skipped: readonly Skipped[];
};

/**
 * `(rows, categories, config) -> a .filter`.
 *
 * Four steps and nothing else: every row is classified into the blocks it is worth, blocks
 * alike but for the row they name merge, the result is ordered so no block shadows a
 * narrower one, and each is written out. The conditions come off the catalog and the look
 * comes off the config, so a new league changes neither this file nor the ones under it.
 */
export function generateFilter(
  rows: readonly CatalogRow[],
  categories: Categories,
  config: Config,
): Generated {
  const decisions: Decision[] = [];
  const skipped: Skipped[] = [];

  for (const row of rows) {
    const result = classifyRow(row, categories, config);
    decisions.push(...result.decisions);
    skipped.push(...result.skipped);
  }

  const ordered = orderBlocks(mergeBlocks(decisions), config.tiers);

  const header = `# ${ordered.length} blocks. Tiers: ${byFloor(config.tiers)
    .map((tier) => `${tier.name} >= ${tier.min}c`)
    .join(", ")}.`;

  const text = [header, ...ordered.map((decision) => renderBlock(decision, config.tiers))].join(
    "\n\n",
  );

  return { text: `${text}\n`, blocks: ordered.length, skipped };
}
