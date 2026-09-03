import { resolveConditions } from "../resolve-conditions.ts";
import type {
  CatalogRow,
  Categories,
  UniqueGroup,
  UniqueListing,
} from "../resolve-conditions.ts";
import { tierOf } from "./tier-of.ts";
import type { Config, Decision, Skipped } from "./types.ts";

export type Classified = {
  readonly decisions: readonly Decision[];
  readonly skipped: readonly Skipped[];
};

/** The price a rule is judged on: the row's own, or the named variant's. */
const priceOf = (row: CatalogRow, variant: string | null): number | undefined =>
  variant === null
    ? row.meanPrice
    : row.variants?.find((one) => one.name === variant)?.meanPrice;

/** A listing's name and price, made safe for a one-line note. Chaos to the hundredth. */
const shown = (listing: UniqueListing): string =>
  `"${listing.name.replace(/[\r\n]+/g, " ")}" ${Math.round(listing.meanPrice * 100) / 100}c`;

const cheapest = (listings: readonly UniqueListing[]): UniqueListing | undefined =>
  listings.reduce<UniqueListing | undefined>(
    (best, one) => (best === undefined || one.meanPrice < best.meanPrice ? one : best),
    undefined,
  );

const dearest = (listings: readonly UniqueListing[]): UniqueListing | undefined =>
  listings.reduce<UniqueListing | undefined>(
    (best, one) => (best === undefined || one.meanPrice > best.meanPrice ? one : best),
    undefined,
  );

/**
 * What one group of uniques on a base is worth drawing as.
 *
 * The block takes the tier of the dearest uncorrupted form, so the base is never drawn
 * quieter than the best thing it could be. When the cheapest form sits on a lower tier the
 * verb turns to `check` and the note names both ends. A corruption outcome over the
 * configured floor is named too — it is a price on this base a filter cannot ask for, so the
 * note is the only place it can go.
 */
function classifyUniques(
  row: CatalogRow,
  group: UniqueGroup,
  categories: Categories,
  config: Config,
): Classified {
  const key = `${row.key} ${group.category}${group.subcategory === null ? "" : `/${group.subcategory}`}`;

  const plain = group.listings.filter((one) => !one.corrupted);
  const floor = cheapest(plain);
  const ceiling = dearest(plain);

  if (floor === undefined || ceiling === undefined) {
    return { decisions: [], skipped: [{ key, reason: "no uncorrupted listing" }] };
  }

  const tier = tierOf(ceiling.meanPrice, config.tiers);

  if (tier === null) {
    return {
      decisions: [],
      skipped: [{ key, reason: `under every tier at ${ceiling.meanPrice}c` }],
    };
  }

  const jumped = tierOf(floor.meanPrice, config.tiers)?.name !== tier.name;

  const corruptions = group.listings.filter(
    (one) => one.corrupted && one.meanPrice >= config.uniques.corruptionMin,
  );
  const corruption = dearest(corruptions);

  const verb = jumped ? "check" : corruption === undefined ? "take" : "gamble";
  const parts = [
    ...(jumped ? [`floor ${shown(floor)} ceiling ${shown(ceiling)}`] : []),
    ...(corruption === undefined
      ? []
      : [
          `corruption ${shown(corruption)}${
            corruptions.length > 1 ? ` and ${corruptions.length - 1} more` : ""
          }`,
        ]),
  ];

  const rules = resolveConditions(
    {
      key,
      name: row.name,
      baseTypes: row.baseTypes,
      category: group.category,
      subcategory: group.subcategory,
    },
    categories,
  );

  return {
    decisions: rules.map((rule) => ({
      conditions: rule.conditions,
      tier: tier.name,
      notes: { tier: tier.name, verb },
      freehand: parts.join(" "),
    })),
    skipped: [],
  };
}

/**
 * Every block one row is worth: one per rule of its own, and one per group of uniques on it.
 *
 * A rule with no price is skipped rather than drawn at a guess, and so is one under every
 * tier's floor — the config saying nothing about a price is the config saying leave it to
 * the game.
 */
export function classifyRow(
  row: CatalogRow,
  categories: Categories,
  config: Config,
): Classified {
  const decisions: Decision[] = [];
  const skipped: Skipped[] = [];

  for (const rule of resolveConditions(row, categories)) {
    const key = rule.variant === null ? row.key : `${row.key} (${rule.variant})`;
    const price = priceOf(row, rule.variant);

    if (price === undefined) {
      skipped.push({ key, reason: "unpriced" });
      continue;
    }

    const tier = tierOf(price, config.tiers);

    if (tier === null) {
      skipped.push({ key, reason: `under every tier at ${price}c` });
      continue;
    }

    decisions.push({
      conditions: rule.conditions,
      tier: tier.name,
      notes: { tier: tier.name, verb: "take" },
      freehand: "",
    });
  }

  for (const group of row.uniques ?? []) {
    const result = classifyUniques(row, group, categories, config);
    decisions.push(...result.decisions);
    skipped.push(...result.skipped);
  }

  return { decisions, skipped };
}
