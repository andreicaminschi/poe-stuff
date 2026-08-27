# @poe/poe-ninja

poe.ninja's economy API as one service object — a second opinion on the same market
PoeWatch scrapes.

## Purpose

**A whole market is 46 requests, not one.** poe.ninja publishes a market per kind of item
and there is no endpoint that answers for a league, so `getLeagueItems` fans out over 28
item types and `getExchangeRatios` over 18 exchange types, four at a time. That comes to
about 19 MB against PoeWatch's 21 MB — the cost is in the request count, not the bytes.

The two fan-outs answer different questions. The item overview is trade listings, the same
kind of claim PoeWatch makes. The Currency Exchange overview is GGG's own book, where
every row had a counterparty on the other side — a different and better claim.

Each endpoint is a pair of files. The `.types.ts` file holds both vocabularies: poe.ninja's
wire shapes, named the way poe.ninja names them, and the output shapes a filter reads a
market through. The mapper between them is `mapItemOverviewLineToNinjaItem` in
`to-item.ts`. Response bodies are asserted, not validated.

## Structure

```
services/poe-ninja/
├── service.ts                        # createPoeNinjaService — binds every endpoint to one context
├── call.ts                           # fetchJson — the request, one retry, the hour-keyed cache
├── config.ts                         # the default base URL, user agent, and GAME_PATH
├── errors.ts                         # PoeNinjaHttpError
├── fan-out.ts                        # bounded concurrency, and a failure that names its type
├── types.ts                          # the context, the cache interface, SparkLine
├── get-leagues.ts / .types.ts        # GET /poe1/api/economy/leagues
├── get-item-overview.ts / .types.ts  # one item type — ITEM_TYPES lives here
├── get-exchange-overview.ts / .types.ts  # one exchange type — EXCHANGE_TYPES lives here
├── get-league-items.ts / .types.ts   # the 28-type fan-out → NinjaItem
├── get-exchange-ratios.ts / .types.ts    # the 18-type fan-out → NinjaExchangeItem
├── item-types.ts                     # what each type actually is, since itemClass cannot be read
├── to-item.ts                        # the mapper, plus itemName and influencesOf
├── dump-cli.ts                       # download one league and write it to a file
├── get-league-items.test.ts
└── to-item.test.ts
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/poe-ninja/service` | `createPoeNinjaService`, `PoeNinjaService`, `PoeNinjaServiceOptions` | Five endpoints bound to one base URL, user agent and cache. Every option has a default. |
| `@poe/poe-ninja/get-leagues.types` | `EconomyLeague` | `id` is what every other call wants. |
| `@poe/poe-ninja/get-item-overview.types` | `ITEM_TYPES`, `ItemType`, `ItemOverviewLine`, `ItemOverviewResponse`, `ModifierLine` | `itemClass` is on the line and is read nowhere — see the gotcha. |
| `@poe/poe-ninja/get-exchange-overview.types` | `EXCHANGE_TYPES`, `ExchangeType`, `ExchangeLine`, `ExchangeItemMeta`, `ExchangeCore`, `ExchangeOverviewResponse` | Returned whole: `lines` prices a slug, `items` names it, `core` says what the price is in. |
| `@poe/poe-ninja/get-league-items.types` | `NinjaItem` | Every field is either poe.ninja's or documented as synthesized. |
| `@poe/poe-ninja/get-exchange-ratios.types` | `NinjaExchangeItem`, `NinjaExchangeSide` | `id` is a negative hash of the slug, so it can never collide with an item id. |
| `@poe/poe-ninja/errors` | `PoeNinjaHttpError` | Carries `url`, `status`, `attempts`. |
| `@poe/poe-ninja/types` | `PoeNinjaContext`, `ResponseCache`, `CachedResponse`, `SparkLine` | Types only. `ResponseCache` is what `PoeNinjaServiceOptions.cache` takes. |

### Not exported

`fetchJson`, `fanOut`, `TYPE_RULES`, `groupFor`, `mapItemOverviewLineToNinjaItem` and the
defaults in `config.ts` are internal.

## Examples

### Download a league

```ts
import { createPoeNinjaService } from "@poe/poe-ninja/service";

const ninja = createPoeNinjaService();
const market = await ninja.getLeagueItems("Allflame");

console.log(`${market.length} rows`);
// 32526 rows
```

### Check the league name first

```ts
import { createPoeNinjaService } from "@poe/poe-ninja/service";

const ninja = createPoeNinjaService();
const leagues = await ninja.getLeagues();

// A misspelled league does not fail — it answers empty on all 28 types.
if (!leagues.some((league) => league.id === "Allflame")) {
  throw new Error("no such league");
}
```

### Read the Currency Exchange

```ts
import { createPoeNinjaService } from "@poe/poe-ninja/service";

const ninja = createPoeNinjaService();
const book = await ninja.getExchangeRatios("Allflame");

const divine = book.find((row) => row.name === "Divine Orb");
console.log(`divine: ${divine?.chaos.chaosValue}c`);
// divine: 212.9c
```

### One kind of item, without the fan-out

```ts
import { createPoeNinjaService } from "@poe/poe-ninja/service";

const ninja = createPoeNinjaService();
const gems = await ninja.getItemOverview("Allflame", "SkillGem");
// 7432 lines, one request
```

## Options

**This package reads no environment.** Nothing here touches `process.env`, there is no
`.env` to load, and every knob is an argument to `createPoeNinjaService`.

| Option | Holds | Default |
| --- | --- | --- |
| `baseUrl` | Base of poe.ninja, trailing slash stripped | `https://poe.ninja` |
| `userAgent` | `user-agent` sent on every request | `poe-stuff/1.0` |
| `cache` | A `ResponseCache` answering calls from previous ones. Its presence is the whole switch | absent — every call re-downloads |

## Gotchas

- **`itemClass` cannot be read.** poe.ninja documents it as a rarity — 0 normal, 1 magic,
  2 rare, 3 unique — and the payload does not honour that: `type=BaseType` returns 20,004
  white crafting bases of which ~95% carry `2`, and `type=UniqueAccessory` carries `10` on
  eight ordinary uniques. What a row *is* comes from the `type` that was asked for, which
  is what `item-types.ts` is for.
- **An empty type is an answer.** Four of the 28 — `Incubator`, `ShrineBelt`, `ImbuedGem`,
  `Memory` — come back with no lines in a healthy league, because nothing traded one. A
  type that never answers throws with its own name in the message.
- **The hour is the whole cache policy, and it is how their terms are honoured.**
  poe.ninja serves these with `max-age=1800` and asks clients not to poll faster than
  minutes; an hour key means a re-run inside the hour makes no request at all. Conditional
  requests are deliberately absent — a `304` would leave nothing to store.
- **Concurrency is bounded at four.** Their terms ask callers to be reasonable with it. A
  flat `Promise.all` over 28 types would open 28 sockets against a service that asks
  nothing of anyone.
- **The first failure abandons the run.** Half a market is not a market: a filter built on
  a short download would look perfectly well-formed and be missing every unique piece of
  armour in the game.
- **`width` and `height` are always `1`.** poe.ninja does not publish a footprint. It is
  the one place this package says something false rather than nothing, and nothing prices
  from it.
- **The divine side of an exchange row is arithmetic, not a second market.** poe.ninja
  quotes one book in one currency and publishes the rate to the other side once.

## How to run

Run the tests:

```bash
yarn test services/poe-ninja
```

Download a league — no `--env-file`, because there is no environment to load:

```bash
node services/poe-ninja/dump-cli.ts --league Allflame --cache-dir cache/poe-ninja
```

Type-check the workspace:

```bash
yarn typecheck
```
