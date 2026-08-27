# @poe/ggg

GGG's Path of Exile trade API as one service object, with every endpoint sharing a single
rate limiter.

## Purpose

GGG rate-limits per IP and answers an overrun with a timed restriction, so guessing wrong
costs a ban rather than a slow request. `createGGGService` builds one limiter and hands
back the endpoints bound to it: requests queue behind that limiter, the server's own
rate-limit headers replace the opening rules on every response, and any restriction it
reports holds every caller for its full length.

Each endpoint is a pair of files. The `.types.ts` file holds the data model — the wire
shape GGG sends — and the domain model this package hands out. The `.ts` file holds the
function and the mappers between the two, named `mapXToY` in the data-to-domain direction
and `create{Action}Request` in the other.

Response bodies are asserted to their data model, never validated. A caller that needs
certainty hands the result to a schema. Limiter state lives in memory on one service
instance, so it is per-process with nothing persisted between runs.

## Structure

```
services/ggg/
├── service.ts                       # createGGGService — owns the limiter, binds every endpoint to it
├── call.ts                          # the request: pace, send, fold headers back, retry or throw
├── rate-limiter.ts                  # createLimiter — FIFO queue, rolling windows, penalty deadline
├── parse-rate-limit-headers.ts      # wire format of the rate-limit headers; no limiter calls
├── config.ts                        # the default GGG URLs — the only ones in the repo
├── errors.ts                        # GggHttpError
├── types.ts                         # types more than one endpoint needs
├── get-item-data.ts                 # GET /data/items + its mappers
├── get-item-data.types.ts           # GGGItemData → GGGItem
├── get-static-items.ts              # GET /data/static + its mapper
├── get-static-items.types.ts        # GGGStaticItemData → GGGStaticItem
├── get-stats.ts                     # GET /data/stats + its mapper
├── get-stats.types.ts               # GGGStatData → GGGStat
├── search-listings.ts               # POST /search/:league + its mapper and request builder
├── search-listings.types.ts         # GGGSearchResponseData → GGGListingSearch
├── fetch-listings.ts                # GET /fetch/:hashes, page chunking, request builder
├── fetch-listings.types.ts          # GGGListingsResponseData → GGGListingPage
├── fetch-currency-hour.ts           # GET /currency-exchange/:hour, on the CDN
├── call.test.ts
├── parse-rate-limit-headers.test.ts
├── rate-limiter.test.ts
└── docs/                            # internal Mermaid diagrams
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/ggg/service` | `createGGGService`, `GGGService`, `GGGServiceOptions` | Builds one limiter and returns every endpoint bound to it. Opens at one request per second until GGG's headers say otherwise. |
| `@poe/ggg/get-item-data.types` | `GGGItem`, `UniqueGGGItem`, `BaseGGGItem`, `GGGItemGroup`, `GGGItemData`, `GGGItemGroupData`, `GGGItemDataResponse` | `GGGItem` is a union on `kind`, synthesised from `flags.unique`. |
| `@poe/ggg/get-static-items.types` | `GGGStaticItem`, `GGGStaticItemData`, `GGGStaticGroupData`, `GGGStaticItemDataResponse` | `category` and `label` carry the exchange group each row arrived in. |
| `@poe/ggg/get-stats.types` | `GGGStat`, `GGGStatOption`, `GGGStatData`, `GGGStatOptionData`, `GGGStatGroupData`, `GGGStatDataResponse` | `options` is set on the stats picked from a list rather than typed as a number. |
| `@poe/ggg/search-listings.types` | `GGGListingSearch`, `GGGSearchResponseData` | `hashes` holds at most 100 entries however large `matchCount` is. |
| `@poe/ggg/fetch-listings.types` | `GGGListingPage`, `GGGListingsResponseData` | `listings` are GGG's rows untouched. |
| `@poe/ggg/errors` | `GggHttpError` | Carries `url`, `status`, `retryable`. |
| `@poe/ggg/types` | `RateLimiter`, `RateLimiterRule`, `RateLimitState`, `CallEvent`, `ResponseCache`, `CachedResponse`, `GggContext`, `CurrencyExchange`, `CurrencyMarket` | Types only. `CallEvent`, `ResponseCache` and `RateLimiterRule` are what `GGGServiceOptions` takes. |

### Not exported

`call`, `createLimiter`, the URL defaults in `config.ts`, `parseRules`, `parseState` and
`parseRetryAfter` are internal. A raw request or a bare limiter cannot be built from
outside the package.

## Examples

### Build a service

```ts
import { createGGGService } from "@poe/ggg/service";

const ggg = createGGGService({ userAgent: "poe-stuff/1.0 (contact: you@example.com)" });
```

### Group every item GGG names by its category

```ts
import { createGGGService } from "@poe/ggg/service";

const ggg = createGGGService({ userAgent: "poe-stuff/1.0 (contact: you@example.com)" });
const categories = await ggg.getItemData();

for (const category of categories) {
  const uniques = category.items.filter((item) => item.kind === "unique");
  console.log(`${category.id} ${category.items.length} items, ${uniques.length} unique`);
}
// accessory 433 items, 289 unique
// armour 1045 items, 549 unique
```

### Search a league, then fetch every page of listings

```ts
import { createGGGService } from "@poe/ggg/service";

const ggg = createGGGService({ userAgent: "poe-stuff/1.0 (contact: you@example.com)" });

const search = await ggg.searchListings(
  { query: { status: { option: "online" }, type: "Chaos Orb" }, sort: { price: "asc" } },
  "Allflame",
);
// search.matchCount is the true total; search.hashes stops at 100

const pages = await ggg.fetchAllListings(search.hashes, search.searchId, 3);
// three pages, ten listings each, fetched one after another through the one limiter
```

### Watch what the limiter is doing

```ts
import { createGGGService } from "@poe/ggg/service";
import type { CallEvent } from "@poe/ggg/types";

const ggg = createGGGService({
  userAgent: "poe-stuff/1.0 (contact: you@example.com)",
  onEvent: (event: CallEvent) => {
    if (event.type === "wait") console.error(`held ${event.ms}ms — ${event.reason}`);
    if (event.type === "penalize") console.error(`restricted ${event.seconds}s`);
  },
});

await ggg.getStats();
```

### Collect a stretch of Currency Exchange hours

```ts
import { createGGGService } from "@poe/ggg/service";

const ggg = createGGGService({ userAgent: "poe-stuff/1.0 (contact: you@example.com)" });

let hourId = 486_000;
for (let collected = 0; collected < 24; collected++) {
  const digest = await ggg.fetchCurrencyHour(hourId);
  const allflame = digest.markets.filter((market) => market.league === "Allflame");
  console.log(`${hourId}: ${allflame.length} markets`);
  hourId = digest.next_change_id;
}
```

## Options

**This package reads no environment.** Nothing here touches `process.env`, there is no
`.env` to load, and every knob is an argument to `createGGGService`. A consumer reads its
own environment and hands the values over.

| Option | Holds | Default |
| --- | --- | --- |
| `userAgent` | `user-agent` sent on every request | **required** |
| `tradeApiUrl` | Base of the trade API, trailing slash stripped | `https://www.pathofexile.com/api/trade` |
| `currencyApiUrl` | Base of the Currency Exchange endpoint on the CDN. The realm is part of it — the default is PoE1 PC | `https://web.poecdn.com/api/currency-exchange` |
| `cache` | A `ResponseCache` answering requests from previous ones. Its presence is the whole switch | absent — every request goes to GGG |
| `rules` | Opening rate-limit rules, replaced by GGG's own headers on the first response | one request per second |
| `smoothAbove` | Pace instead of bursting once a window is this full, as a fraction | absent |
| `onEvent` | Called as each request progresses | absent |

`userAgent` is the one option with no default. GGG asks that it name the application and
give them a way to reach you, so they can contact the author instead of blocking the
traffic — and a default would send a contact that does not exist:

```
<app>/<version> (contact: <email>)
```

A disk cache is three lines in the consumer:

```ts
import { fileCache } from "@util/core/file-cache";
import type { CachedResponse } from "@poe/ggg/types";

const cache = fileCache<CachedResponse>("cache/ggg");
```

## Gotchas

- **One service is one IP.** Limiter state is per-instance and per-process. Two services
  in one process means twice the real request rate against a single budget, and GGG counts
  the total.
- **Server rules overwrite the opening guess.** Any non-empty `x-rate-limit-ip` replaces
  the whole rule set. A missing or unparseable header parses to an empty list and is
  ignored, so the last known rules stay in force.
- **A hold never shrinks.** `penalize` keeps the later deadline. During a restriction every
  in-flight response reports the same one, and a smaller figure arriving afterwards must
  not cut it short.
- **Rules carry one slot of headroom.** `parseRules` subtracts 1 from each published limit,
  because the state header describes the previous response and the last slot in a window is
  the one most likely to be wrong.
- **IP tier only.** Account and client rate-limit tiers are not read.
- **One cache, and the digests expire by key rather than by age.** `/data/items`,
  `/data/static` and `/data/stats` put the hour into the cache key, so an entry is only ever
  read back inside the hour that wrote it. Old files are never deleted, they only stop being
  asked for. Everything else keys on the request alone and never expires — which is why the
  cache belongs on a laptop and not in production.
- **`fetchAllListings` is sequential.** Every page shares the one limiter, so racing them
  makes the run no faster and only lengthens the queue.

## How to run

Run the tests:

```bash
yarn test services/ggg
```

Type-check the workspace:

```bash
yarn typecheck
```
