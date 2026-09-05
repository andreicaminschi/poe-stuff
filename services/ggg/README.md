# @poe/ggg

The Path of Exile trade site's own back end — its search, its item and modifier lists, its
Currency Exchange digests — as one service object on one rate limiter.

## Purpose

GGG rate-limits per IP and answers an overrun with a timed restriction, so guessing wrong
costs a ban rather than a slow request. `createGGGService` builds one limiter and hands
back the endpoints bound to it: requests queue behind that limiter, the server's own
rate-limit headers replace the opening rules on every response, and any restriction it
reports holds every caller for its full length.

**Every endpoint here is one the trade website calls to draw itself.** There is no public
API programme behind them and no documentation. `/data/items` and `/data/stats` are the
lists the site downloads to fill its own search form, and `/search` and `/fetch` are what
its search button does. This package reads them for other purposes, which is where most of
the gotchas below come from.

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
├── config.ts                        # the default trade and CDN bases
├── errors.ts                        # GggHttpError
├── types.ts                         # types more than one endpoint needs
├── get-item-data.ts                 # GET /data/items + its mappers
├── get-item-data.types.ts           # GGGItemData → GGGItem
├── get-stats.ts                     # GET /data/stats + its mapper
├── get-stats.types.ts               # GGGStatData → GGGStat
├── search-listings.ts               # POST /search/:league + its mapper and request builder
├── search-listings.types.ts         # GGGSearchResponseData → GGGListingSearch
├── fetch-listings.ts                # GET /fetch/:hashes, page chunking, request builder
├── fetch-listings.types.ts          # GGGListingsResponseData → GGGListingPage
├── fetch-currency-hour.ts           # GET /currency-exchange/:hour, on the CDN
├── *.test.ts                        # one beside each source file
└── docs/                            # internal Mermaid diagrams
```

## Public API

### Entry points

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/ggg/service` | `createGGGService`, `GGGService`, `GGGServiceOptions` | Builds one limiter and returns every endpoint bound to it. Opens at one request per second until GGG's headers say otherwise. |
| `@poe/ggg/trade-url` | `tradeSearchUrl`, `TradeSearch` | The trade site page for one item, as a person opens it in a browser: a unique by `name` plus `type`, a base by `type`. Always asks for `securable`, the status GGG calls Instant Buyout, and narrows on `foulborn` and `corrupted` when either is given. Pure — builds a URL and fetches nothing, so no limiter is involved. |
| `@poe/ggg/get-item-data.types` | `GGGItem`, `UniqueGGGItem`, `BaseGGGItem`, `GGGItemGroup`, `GGGItemData`, `GGGItemGroupData`, `GGGItemDataResponse` | `GGGItem` is a union on `kind`, synthesised from `flags.unique`. |
| `@poe/ggg/get-stats.types` | `GGGStat`, `GGGStatOption`, `GGGStatData`, `GGGStatOptionData`, `GGGStatGroupData`, `GGGStatDataResponse` | `options` is set on the stats picked from a list rather than typed as a number. |
| `@poe/ggg/search-listings.types` | `GGGListingSearch`, `GGGSearchResponseData` | `hashes` holds at most 100 entries however large `matchCount` is. |
| `@poe/ggg/fetch-listings.types` | `GGGListingPage`, `GGGListingsResponseData` | `listings` are GGG's rows untouched. |
| `@poe/ggg/errors` | `GggHttpError` | Carries `url`, `status`, `retryable`. |
| `@poe/ggg/types` | `RateLimiter`, `RateLimiterRule`, `RateLimitState`, `CallEvent`, `ResponseCache`, `CachedResponse`, `GggContext`, `CurrencyExchange`, `CurrencyMarket`, `CurrencySide` | Types only. `CallEvent`, `ResponseCache` and `RateLimiterRule` are what `GGGServiceOptions` takes. |

### Service methods

Everything `createGGGService` returns. The first two are the trade site's own reference
lists; the next four are its search; the last is the CDN.

| Method | What it is for | What comes back |
| --- | --- | --- |
| `getItemData()` | The name list behind the trade site's search box — every name it will let a player pick. | `GGGItemGroup[]`: the site's broad categories, each holding base types, uniques with the base each rolls on, and a row per variant for transfigured gems and blighted maps. Carries only what players have listed — see the first gotcha. |
| `getStats()` | The modifier list behind the site's stat filters — every line it will let a player search on. | `GGGStat[]`, groups flattened, each rolled number written as `#`. `options` is set where the value is picked from a list. Includes the pseudo stats the site derives rather than reads off an item. Carries only the modifiers on items players have listed. |
| `searchListings(query, league)` | Run one search, the way the site's search button does. | `GGGListingSearch`: the `searchId` that `fetchListings` needs, the matching listing `hashes`, `matchCount` and `complexity`. `hashes` stops at 100 however large `matchCount` is. |
| `fetchListings(hashes, searchId, page)` | Turn one page of hashes into listings. | `GGGListingPage`: the `searchId` and `page` echoed back, and `listings` exactly as GGG sent them. |
| `fetchAllListings(hashes, searchId, maxPages?)` | Every page a search's hashes are worth, one after another. | `GGGListingPage[]`, numbered from zero. Sequential — the pages share one limiter. |
| `pageHashes(hashes, maxPages?)` | Cut a hash list into pages without asking GGG anything. | Arrays of at most ten hashes. **Makes no request.** |
| `fetchCurrencyHour(hourId, options?)` | One hour of aggregate Currency Exchange history, off the CDN. `hourId` is unix seconds on the hour, and the hour now running is not published until it ends. | `CurrencyExchange`: `next_change_id` for walking the stream, and `markets`. A market names both sides by metadata id and carries no name and no category — it is not only currency either, since cards, scarabs and fragments trade here too. Passing `league` trims the markets here rather than on the server. |

### Not exported

`call`, `createLimiter`, the URL defaults in `config.ts`, `parseRules`, `parseState` and
`parseRetryAfter` are internal. A raw request or a bare limiter cannot be built from
outside the package.

## Examples

### List every unique the trade site currently knows

```ts
import { createGGGService } from "@poe/ggg/service";

const ggg = createGGGService({ userAgent: "poe-stuff/1.0 (contact: you@example.com)" });

for (const category of await ggg.getItemData()) {
  for (const item of category.items) {
    if (item.kind === "unique") console.log(`${item.name} — ${item.baseType}`);
  }
}
// Headhunter — Leather Belt
// Mageblood — Heavy Belt
```

### Search a league, then fetch the cheap end of it

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
  const digest = await ggg.fetchCurrencyHour(hourId, { league: "Allflame" });
  console.log(`${hourId}: ${digest.markets.length} markets`);
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
import { fileCache } from "@util/cache/file-cache";
import type { CachedResponse } from "@poe/ggg/types";

const cache = fileCache<CachedResponse>("cache/ggg");
```

## Gotchas

- **The search lists only know what has been listed.** `/data/items` and `/data/stats`
  exist to fill the trade site's search form, so they hold what the site can currently be
  asked to search for — which is what players have actually put up for sale. A unique
  introduced this league, say Mageblood, is absent from `getItemData`, and its modifiers
  are absent from `getStats`, until the first player lists one for sale. Both lists fill in
  over the opening days of a league as the drops arrive and get traded. Treating either as
  the game's catalogue breaks at exactly the moment a league starts, which is when it
  matters most. For what the game contains regardless of the market, read `@poe/repoe`.
- **One service is one budget, and GGG keeps that budget per IP.** Two services in one
  process share one address and spend one budget twice as fast, neither aware of the
  other. Two services on two machines are two addresses and two budgets. The exception
  inside one process is an endpoint metered under its own policy: GGG counts search and
  fetch separately, and a limiter holds one rule set at a time, so a service each is how
  those two get paced correctly.
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
- **One cache, and the data lists expire by key rather than by age.** `/data/items` and
  `/data/stats` put the hour into the cache key, so an entry is only ever read back inside
  the hour that wrote it. Old files are never deleted, they only stop being asked for.
  Everything else keys on the request alone and never expires — which is why the cache
  belongs on a laptop and not in production.
- **`fetchAllListings` is sequential.** Every page shares the one limiter, so racing them
  makes the run no faster and only lengthens the queue.
- **The CDN is on the trade site's budget.** `fetchCurrencyHour` goes to a different host
  that publishes no rate-limit headers of its own, but it is the same address spending the
  same budget, and Cloudflare fronts the whole domain — so it is paced by the same limiter
  as everything else rather than being let through free.

## How to run

Run the tests:

```bash
yarn test services/ggg
```

Type-check the workspace:

```bash
yarn typecheck
```

## Diagrams

Mermaid `.mmd` files in `services/ggg/docs/`, rendered by any Mermaid viewer.

| File | Shows |
| --- | --- |
| `call.mmd` | One `call` end to end: the cache lookup, the limiter slot, the request, the rate-limit headers folded back, and the retry or the throw. `onEvent` is drawn as an annotation on each phase rather than a party, because it runs inline on the caller's own stack. |
