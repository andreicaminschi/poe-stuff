# @poe/generator

Turns the published catalog into a styled `.filter`. **Only the bucketing is written.**

`plan.md` holds the rest of the design.

## What a bucket is

A bucket is one tier of the ladder: a floor, a ceiling, and whether an item may reach it by
corrupting. The ceiling is exclusive, and the top bucket leaves it out and takes everything
above its floor.

```ts
{ name: "T3", floor: 20, ceiling: 30, gamble: true }
```

## The three prices

Every row is worth three numbers, and all three come off the row's own forms:

| | |
| --- | --- |
| `take` | its cheapest form — what it is worth as it lies |
| `check` | its dearest form — what it could be worth once you look |
| `gamble` | the dearest form that has to be corrupted first |

A form whose conditions ask for `Corrupted True` is the gambled one. That is structural: no
variant name is read, so a taxonomy that writes the condition differently still works.

**A unique hanging off a base is not the base.** A unique is its own row, in its own category,
told apart on the ground by `Rarity`. A base is never worth what a unique that drops on it is
worth, so `row.uniques` is not read.

**A form PoeWatch flagged `lowConfidence` is not read at all.** Those prices stand on a handful
of listings — one corruption outcome reached 2.5e13 Chaos — and a single one would carry a
whole bucket. Dropping them costs coverage: it leaves several hundred rows with no usable
price, which is reported rather than hidden.

## How a row is placed

Buckets are tried richest-first, so an item reaches the highest tier any of its three prices
earns. Inside one bucket the surest verb wins: `take`, then `check`, then `gamble`.

**A bucket that refuses gambling never reads the corruption price.** That is the rule that
sends a cheap base with a spectacular corruption outcome to the tier its aspirational price
earns instead of the one its corruption would.

A row no bucket wanted is returned in `unplaced` with the reason, because "nothing took it" is
a finding and not a failure. The reasons are distinct on purpose — a row falling in a hole
between two buckets and a row whose only good price is a corruption no gambling bucket reaches
are different problems with different fixes.

## Call it per category

A category whose rungs are stack sizes and one whose rungs are Chaos do not share a ladder.
`bucketItems` takes one category's rows and one ladder, and nothing here tries to reconcile
two.

## The report

Runs the bucketing category by category, then shows each rule and each edge case with real
rows from the catalog.

```bash
node --env-file=apps/generator/.env apps/generator/bucket-report-cli.ts
```

| Var | Holds |
| --- | --- |
| `POE_LEAGUE` | Which league's published catalog to read. No default |
| `LAKE_ROOT` | Where the lake lives. Optional, `.s3` |
