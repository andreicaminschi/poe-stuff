# @poe/poe-watch

PoeWatch's price digests as one service object: a whole league's market per call.

## Purpose

PoeWatch scrapes trade listings and publishes what it found. That is the first thing to
know about every number here — **a price from PoeWatch is what somebody asked for an item,
not what one sold for.** GGG's own Currency Exchange, which `@poe/ggg` reads, is the other
kind of claim.

Three endpoints, and each answers for a whole league in one request: `/compact` prices
every item, `/corruptions` prices every corrupted-implicit outcome, and `/exchange/ratios`
gives both sides of every item's currency market. PoeWatch publishes no rate limits and
draws on no GGG budget, so there is no limiter — but the answers are tens of megabytes, so
the cache is what makes a re-run affordable.

Each endpoint is a pair of files. The `.types.ts` file holds the wire shape PoeWatch sends;
the `.ts` file holds the function. Response bodies are asserted, not validated — a caller
that needs certainty hands the result to a schema.

## Structure

```
services/poe-watch/
├── service.ts                       # createPoeWatchService — binds every endpoint to one context
├── call.ts                          # the request: send, throw on non-2xx, read and write the cache
├── config.ts                        # the default base URL and user agent
├── errors.ts                        # PoeWatchHttpError
├── types.ts                         # the context and the cache interface
├── get-compact-data.ts              # GET /compact
├── get-compact-data.types.ts        # ItemData — a union of 31 categories on `category`
├── get-corruption-data.ts           # GET /corruptions
├── get-corruption-data.types.ts     # ItemCorruptions, CorruptionOutcome
├── get-exchange-ratios.ts           # GET /exchange/ratios
└── get-exchange-ratios.types.ts     # ExchangeRatioItem, ExchangeRatioSide, Game
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/poe-watch/service` | `createPoeWatchService`, `PoeWatchService`, `PoeWatchServiceOptions` | Three endpoints bound to one base URL, user agent and cache. Every option has a default. |
| `@poe/poe-watch/get-compact-data.types` | `ItemData`, `ItemCategory`, `ItemCommon`, `ExchangePair`, `PerfectPrice`, `CompactResponse`, and the 31 per-category rows | `ItemData` is a union discriminated on `category`; narrow before reaching a category's own fields. |
| `@poe/poe-watch/get-corruption-data.types` | `ItemCorruptions`, `CorruptionOutcome` | `item_id` joins to `ItemData.id`, though the two endpoints are separate snapshots and a few ids never resolve. |
| `@poe/poe-watch/get-exchange-ratios.types` | `ExchangeRatioItem`, `ExchangeRatioSide`, `ExchangeRatioHistoryPoint`, `ExchangeRatiosResponse`, `Game` | A side that never traded comes back as zeroes rather than absent. |
| `@poe/poe-watch/errors` | `PoeWatchHttpError` | Carries `url`, `status`. |
| `@poe/poe-watch/types` | `PoeWatchContext`, `ResponseCache`, `CachedResponse` | Types only. `ResponseCache` is what `PoeWatchServiceOptions.cache` takes. |

### Not exported

`call`, `currentHour` and the defaults in `config.ts` are internal. A raw request cannot be
built from outside the package.

## Examples

### Price a league

```ts
import { createPoeWatchService } from "@poe/poe-watch/service";

const watch = createPoeWatchService();
const market = await watch.getCompactData("Allflame");

const bases = market.filter((row) => row.category === "bases");
console.log(`${market.length} rows, ${bases.length} crafting bases`);
// 33144 rows, 19856 crafting bases
```

### Keep the answers on disk

```ts
import { fileCache } from "@util/cache/file-cache";
import { createPoeWatchService } from "@poe/poe-watch/service";
import type { CachedResponse } from "@poe/poe-watch/types";

const watch = createPoeWatchService({
  cache: fileCache<CachedResponse>("cache/poe-watch"),
});

await watch.getCompactData("Allflame"); // downloads
await watch.getCompactData("Allflame"); // free, inside the same hour
```

### What a Vaal Orb is worth on one item

```ts
import { createPoeWatchService } from "@poe/poe-watch/service";

const watch = createPoeWatchService();
const outcomes = await watch.getCorruptionData("Allflame");

for (const item of outcomes.slice(0, 1)) {
  for (const outcome of item.corruptions) {
    console.log(`${outcome.name}: ${outcome.mean}c over ${outcome.daily} listings`);
  }
}
```

## Options

**This package reads no environment.** Nothing here touches `process.env`, there is no
`.env` to load, and every knob is an argument to `createPoeWatchService`.

| Option | Holds | Default |
| --- | --- | --- |
| `baseUrl` | Base of the PoeWatch API, trailing slash stripped | `https://api.poe.watch` |
| `userAgent` | `user-agent` sent on every request | `poe-stuff/1.0` |
| `cache` | A `ResponseCache` answering calls from previous ones. Its presence is the whole switch | absent — every call re-downloads |

`userAgent` has a default here, unlike `@poe/ggg`, because PoeWatch publishes no
requirement about it. Naming a real contact is still the polite thing to send.

## Gotchas

- **`/compact` needs `all=true` and this package always sends it.** Without it PoeWatch
  answers with 13,195 rows and not one crafting base; with it, 33,144 rows, of which 19,856
  are the bases. The documented meaning is "all items" against "only items with current
  data", but the withheld bases have current data by any test — Large Cluster Jewel comes
  back on 9,923 daily listings either way. Every white base in the game hangs on it.
- **A price here is a listing, not a sale.** PoeWatch scrapes what people are asking. Treat
  it as an upper bound on what anything actually changed hands for.
- **The cache expires by key, not by age.** The hour is part of every key, so an entry is
  only ever read back inside the hour that wrote it. PoeWatch recomputes on the hour, so
  nothing older is worth keeping. Old files are never deleted, they only stop being asked
  for.
- **No limiter, and no retry.** PoeWatch publishes no rate limits and each call is one
  request for a whole league, so a failure is thrown rather than nursed — asking again is
  the caller's decision.
- **`game` is a request parameter, not a base URL.** One API serves PoE1 and PoE2, and
  league names collide across them.

## How to run

Type-check the workspace:

```bash
yarn typecheck
```
