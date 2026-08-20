# @poe/filter

One league's market, turned into a Path of Exile item filter.

## Purpose

A filter reads what a drop shows on the ground — rarity, base type, stack size, map tier,
a handful of flags — and never which item it is. So this package prices *buckets*: the set
of items that share everything the game shows. A Leather Belt on the floor is a 1c belt or
it is Headhunter, and one block answers for both.

`classify` gives every bucket a tier (how loud) and a verb (what to do about it).
`emitFilter` turns buckets into blocks, merging the ones that share a treatment and
ordering them so the specific claim is written above the general one. `verifyFilter` reads
the finished file back over the same buckets and reports every one that a different block
answered for.

It stops at whether the file says what the buckets said. Whether a bucket was priced right
is a question about the market, and nothing here asks it.

## Structure

```
classify.ts             # market in, buckets out. Every tier and verb decision
types.ts                # Bucket, Tier, Verb, BucketFamily, Levers, FilterUnique
fetch-inputs.ts         # the five API calls a classification reads
merge-uniques.ts        # GGG's unique list under the wiki's drop restriction
emit-filter.ts          # buckets to blocks, merged and ordered
verify-filter.ts        # the finished file, read back over its own buckets
build-tier-page.ts      # buckets inlined into tier-page.html, one standalone file
pipeline-cli.ts         # classify then emit — yarn filter
classify-cli.ts         # phase one alone: writes buckets-draft.json
filter-cli.ts           # phase two alone: writes proto.filter, verifies it
tiers-cli.ts            # classify then serve the tier board — yarn tiers
serve-cli.ts            # the board on localhost, rebuilt on every request
tier-page-cli.ts        # the board as a file on disk
unique-items-cli.ts     # GGG's unique list as JSON on stdout
max-stacks.json         # how many of an item fit in one stack
hard-to-categorize.json # items tiered `varies`, whatever their price says
tier-page.html          # the board's template. Data goes in its __BUCKETS__ slot
emit-filter.test.ts     # block merging and ordering
verify-filter.test.ts   # probe items, shadowing, the unprobeable case
pipeline.md             # the two phases and what each one writes
levers.md               # every tunable number, and what moving it does
buckets-draft.md        # commentary on the classification the last run produced
```

Four files in the folder are data rather than source. `buckets-draft.json`,
`proto.filter` and `tiers.html` are what the CLIs write. `neversink-sample.filter` is a
filter somebody else wrote, kept as a parser input.

## Public API

| Import | Exports | Contract |
| --- | --- | --- |
| `@poe/filter/classify` | `classify`, `marketRates`, `ClassifyInput` | `classify(input, levers)` returns every bucket a snapshot supports, richest first. `marketRates` reads the divine price the tier cuts are multiples of, and throws when the exchange has none |
| `@poe/filter/fetch-inputs` | `fetchInputs`, `FetchedInput` | One league from five APIs, in parallel, through the hour caches. The GGG call goes through a limiter |
| `@poe/filter/emit-filter` | `emitFilter`, `planBlocks`, `FilterBlockPlan` | `emitFilter(buckets, stamp)` returns the whole file as text. `planBlocks` returns the blocks alone, for counting or inspecting |
| `@poe/filter/verify-filter` | `verifyFilter`, `probeItem`, `Conflict` | `verifyFilter(buckets, text)` returns one `Conflict` per bucket the file answers for wrongly. Empty is the guarantee. `probeItem` builds the item a bucket's own condition lines describe |
| `@poe/filter/merge-uniques` | `mergeUniques` | GGG decides which uniques exist; the wiki decides `restrictedDrop` and `category`. A name is restricted only when every wiki row carrying it is |
| `@poe/filter/build-tier-page` | `buildTierPage` | Reads `buckets-draft.json` and `tier-page.html` from disk, returns `{ html, count }` |
| `@poe/filter/types` | `Bucket`, `Tier`, `Verb`, `BucketFamily`, `Levers`, `FilterUnique` | Types only |

## Examples

### Classify a league

```ts
import { classify } from "@poe/filter/classify";
import { fetchInputs } from "@poe/filter/fetch-inputs";

const input = await fetchInputs("Allflame");
const buckets = classify(input);

console.log(buckets.length); // 5836
console.log(buckets[0]);
// { id: "stack:currency/Mirror of Kalandra@1", family: "stackables",
//   verb: "take", tier: "T0", ceiling: 192361, setBy: "Mirror of Kalandra 192kc", … }
```

### Set the levers before generating

```ts
import { classify } from "@poe/filter/classify";
import { fetchInputs } from "@poe/filter/fetch-inputs";
import type { Levers } from "@poe/filter/types";

const levers: Levers = {
  // A click is worth at least 3 chaos to this player.
  minClickValue: 3,
  hideUniqueMaps: false,
  // Gold has no market price. This is what one is worth to them.
  goldPerDivine: 800_000,
};

const buckets = classify(await fetchInputs("Allflame"), levers);

console.log(buckets.filter((bucket) => bucket.tier !== "hidden").length);
```

A lever changes which blocks exist. Moving one means classifying again.

### Write a filter from buckets already on disk

```ts
import { readFile, writeFile } from "node:fs/promises";
import { emitFilter, planBlocks } from "@poe/filter/emit-filter";
import type { Bucket } from "@poe/filter/types";

const buckets = JSON.parse(
  await readFile("packages/filter/buckets-draft.json", "utf8"),
) as readonly Bucket[];

const text = emitFilter(buckets, "Allflame, divine 204.5c");
await writeFile("packages/filter/proto.filter", text);

console.log(`${buckets.length} buckets, ${planBlocks(buckets).length} blocks`);
// 5836 buckets, 487 blocks
```

### Ask a filter whether it still covers the market

```ts
import { readFile } from "node:fs/promises";
import { classify } from "@poe/filter/classify";
import { fetchInputs } from "@poe/filter/fetch-inputs";
import { verifyFilter } from "@poe/filter/verify-filter";

const text = await readFile("packages/filter/proto.filter", "utf8");
const today = classify(await fetchInputs("Allflame"));

for (const conflict of verifyFilter(today, text)) {
  console.log(`${conflict.reason} ${conflict.bucket}`);
  console.log(`  wanted ${conflict.expected}, got ${conflict.got}`);
}
// unprobeable map:t16 corrupted 8 mods
//   wanted T2 take maps, got no item satisfies its own conditions
```

`reason` is `shadowed` when an earlier block took the item, `missed` when no block did,
and `unprobeable` when no item can satisfy the bucket's own lines. A `shadowed` conflict
carries the block that took it in `by`.

### Merge the two unique lists on their own

```ts
import { getUniqueItems } from "@poe/ggg/get-unique-items";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { getUniqueItems as getWikiUniques } from "@poe/poe-wiki/get-unique-items";
import { mergeUniques } from "@poe/filter/merge-uniques";

const [ggg, wiki] = await Promise.all([
  getUniqueItems({ limiter: createLimiter([{ max: 1, windowMs: 1_000 }]) }),
  getWikiUniques(),
]);

const uniques = mergeUniques(ggg, wiki);

console.log(uniques.find((unique) => unique.name === "Headhunter"));
// { name: "Headhunter", baseType: "Leather Belt", category: "Belt", restrictedDrop: false }
```

A unique the wiki has and GGG does not is dropped. A unique with no wiki row keeps
`restrictedDrop: false`, which leaves it in its base's bucket.

## Environment

From `packages/filter/.env`, loaded with `node --env-file=packages/filter/.env`.
`requireEnv` throws at first use, so a missing var surfaces on the call that needs it.

| Var | Holds | Example |
| --- | --- | --- |
| `POE_USER_AGENT` | Sent on every outbound request — GGG, PoeWatch and the wiki alike. Names the app and a real contact address | `poe-stuff/1.0 (you@example.com)` |
| `POE_WATCH_BASE_URL` | Base of the PoeWatch API | `https://api.poe.watch` |
| `POE_WIKI_BASE_URL` | Base of poewiki.net. Cargo queries join `/index.php` onto it | `https://www.poewiki.net` |
| `POE_TRADE_API_URL` | Base of the trade API. One call joins `/data/items` onto it | `https://www.pathofexile.com/api/trade` |
| `POE_WATCH_LEAGUE` | The league to classify. `--league` on any CLI overrides it | `Allflame` |
| `POE_WATCH_CACHE_DIR` | Cached league digests, one per league per hour. Optional | `cache/poe-watch` |
| `POE_WIKI_CACHE_DIR` | Cached wiki exports, one per hour. Optional | `cache/poe-wiki` |
| `CACHE_DIR` | Cached GGG responses and the unique-item digest. Optional | `cache/ggg` |
| `FILTER_PORT` | Port the tier board serves on. Optional, defaults to 8123 | `8123` |

`FILTER_PORT` is read by `serve-cli.ts` and is absent from `.env`.

## Gotchas

- **`/compact` answers without a single crafting base unless the request asks for
  `all=true`.** `@poe/poe-watch/get-compact-data` sends it. 13,195 rows come back without
  it and 33,144 with, and the difference is every white base, cluster jewel, abyss jewel,
  talisman and tincture in the game — the whole `bases` family.
- **Every cache key carries the league and the hour.** Two runs inside one hour classify
  identical bytes and cost no requests. A run in a new hour fetches everything again.
- **A lever is set before generating.** `minClickValue`, `hideUniqueMaps` and
  `goldPerDivine` change which buckets exist, so they belong to a classification rather
  than to a finished file.
- **A shadowed bucket exits non-zero from `filter-cli.ts`.** Block order decides which
  block takes an item, and a block written one line too early takes an item a later block
  was for. The file still parses and the game still loads it. `verifyFilter` is what says
  so, and its exit code is the pipeline's.
- **Gold is priced from `goldPerDivine` and nothing else.** It cannot be traded, so no
  feed quotes it. Its stack ladder stops at the cap in `max-stacks.json`.
- **Rows under 20 daily listings are not read at all.** `MIN_DAILY_LISTINGS` in
  `classify.ts` drops them before anything is priced, which takes a genuinely scarce item
  out along with a fabricated price.

## How to run

Fetch the league, build the buckets, build and verify the filter:

```bash
yarn filter
```

Classify a league and open the tier board on the result:

```bash
yarn tiers
```

Phase one alone — writes `buckets-draft.json`:

```bash
node --env-file=packages/filter/.env packages/filter/classify-cli.ts
```

Phase two alone — reads that file, writes `proto.filter`, and needs no env:

```bash
node packages/filter/filter-cli.ts
```

Every unique GGG ships, as JSON:

```bash
node --env-file=packages/filter/.env packages/filter/unique-items-cli.ts > uniques.json
```

Type-check the workspace:

```bash
yarn typecheck
```
