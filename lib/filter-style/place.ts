import { holds, ladderOf, span } from "./place/ladder.ts";
import {
  VERBS,
  UNPRICED,
  WANT,
  type Bucket,
  type Hint,
  type Item,
  type PlaceOptions,
  type Placed,
  type Placement,
  type Prices,
  type Unplaced,
  type Verb,
} from "./types.ts";

const WHY: Readonly<Record<Verb, string>> = {
  take: "worth it as it lies",
  check: "identifying it could reach it",
  gamble: "corrupting it could reach it",
};

/** A category without a hint never reads that hint's price. */
const allowed = (prices: Prices, hints: readonly Hint[]): Prices => ({
  ...(prices.take === undefined ? {} : { take: prices.take }),
  ...(prices.check === undefined || !hints.includes("check") ? {} : { check: prices.check }),
  ...(prices.gamble === undefined || !hints.includes("gamble") ? {} : { gamble: prices.gamble }),
});

function wantedPlacement(item: Item): Placement {
  const verb = VERBS.find((one) => item.prices[one] !== undefined) ?? "take";
  return { item, bucket: WANT, verb, reason: "on the want-to-see list, shown whatever it is worth", won: true };
}

function unpricedPlacement(item: Item): Placement {
  return { item, bucket: UNPRICED, verb: "take", reason: "flagged unpriceable in the taxonomy", won: true };
}

function qualifications(ladder: readonly Bucket[], item: Item): readonly Placement[] {
  return VERBS.flatMap((verb) => {
    const price = item.prices[verb];
    if (price === undefined) return [];

    const bucket = ladder.find((one) => holds(one, price));
    if (bucket === undefined) return [];

    return [{ item, bucket: bucket.name, verb, reason: `${WHY[verb]}: ${price}c, inside ${span(bucket, "c")}`, won: false }];
  });
}

/** Richest bucket first, then the surest verb. */
function crowned(ladder: readonly Bucket[], found: readonly Placement[]): readonly Placement[] {
  const rank = (one: Placement) =>
    ladder.findIndex((bucket) => bucket.name === one.bucket) * VERBS.length + VERBS.indexOf(one.verb);
  const best = Math.min(...found.map(rank));

  return found.map((one) => (rank(one) === best ? { ...one, won: true } : one));
}

function byPrice(ladder: readonly Bucket[], items: readonly Item[], options: PlaceOptions): Placed {
  const placed: Placement[] = [];
  const unplaced: Unplaced[] = [];

  for (const one of items) {
    const item = { ...one, prices: allowed(one.prices, options.hints) };

    if (options.wanted.includes(item.name)) {
      placed.push(wantedPlacement(item));
      continue;
    }

    if (item.unpriceable === true) {
      placed.push(unpricedPlacement(item));
      continue;
    }

    const found = qualifications(ladder, item);
    if (found.length === 0) {
      unplaced.push({ item, reason: "nothing priced it" });
      continue;
    }

    placed.push(...crowned(ladder, found));
  }

  return { ladder, placed, unplaced };
}

function stackPlacement(item: Item, bucket: Bucket): Placement {
  return {
    item,
    bucket: bucket.name,
    verb: "take",
    reason: `a stack of ${span(bucket, "")}`,
    won: true,
    stack: bucket.ceiling === undefined ? { floor: bucket.floor } : { floor: bucket.floor, ceiling: bucket.ceiling },
  };
}

function byStack(ladder: readonly Bucket[], items: readonly Item[], options: PlaceOptions): Placed {
  const placed = items.flatMap((item) => {
    if (options.wanted.includes(item.name)) return [wantedPlacement(item)];
    if (item.unpriceable === true) return [unpricedPlacement(item)];

    return ladder.map((bucket) => stackPlacement(item, bucket));
  });

  return { ladder, placed, unplaced: [] };
}

/**
 * One category's items, placed on its ladder.
 *
 * An item qualifies for every bucket one of its prices reaches, and only one qualification
 * wins the block. A want-to-see item goes there and nowhere else, and an unpriceable one goes
 * to Unpriced. In a stack-size category
 * the floors count `StackSize`, so every item gets one block per bucket.
 */
export function place(items: readonly Item[], options: PlaceOptions): Placed {
  const ladder = ladderOf(options.floors, options.disabled);
  if (options.tiering === "stack-size") return byStack(ladder, items, options);

  return byPrice(ladder, items, options);
}
