# @poe/repoe

RePoE's exports as one service object: the game's own item data, straight off the client.

## Purpose

RePoE is a community project that unpacks Path of Exile's data files after each patch and
publishes them as static JSON. The fork this package reads serves them from GitHub Pages.

That makes it a different kind of source from everything else in the repo. **RePoE carries
no prices and no listings — it is what the game knows about an item, not what the market
thinks of it.** `@poe/poe-watch` and `@poe/poe-ninja` say what a Blacksmith's Whetstone is
worth; RePoE says it stacks to 20, drops from level 1, and the client draws it from
`Art/2DItems/Currency/CurrencyWeaponQuality.dds`.

One endpoint today: `base_items.json`, every base item in the game. It is a static file
with no query, no league and no partial fetch — the whole export, or nothing. Nothing
here draws on the GGG budget and no rate limits are published, so there is no limiter; the
cache is what makes a re-run affordable.

The endpoint is a pair of files. The `.types.ts` file holds the wire shape RePoE publishes;
the `.ts` file holds the function. Response bodies are asserted, not validated — a caller
that needs certainty hands the result to a schema.

## Structure

```
services/repoe/
├── service.ts                  # createRepoeService — binds every endpoint to one context
├── call.ts                     # the request: send, throw on non-2xx, read and write the cache
├── config.ts                   # the default base URL and user agent
├── errors.ts                   # RepoeHttpError
├── types.ts                    # the context and the cache interface
├── get-base-items.ts           # GET /base_items.json
└── get-base-items.types.ts     # BaseItems, BaseItem, BaseItemProperties, and three helpers
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/repoe/service` | `createRepoeService`, `RepoeService`, `RepoeServiceOptions` | One endpoint bound to a base URL, user agent and cache. Every option has a default. |
| `@poe/repoe/get-base-items.types` | `BaseItems`, `BaseItem`, `BaseItemProperties`, `BaseItemRequirements`, `BaseItemVisualIdentity`, `BaseItemBuff`, `DefenceRange` | `BaseItems` is a `Record` keyed by metadata id. There is no envelope — the file is the record. |
| `@poe/repoe/errors` | `RepoeHttpError` | Carries `url`, `status`. |
| `@poe/repoe/types` | `RepoeContext`, `ResponseCache`, `CachedResponse` | Types only. `ResponseCache` is what `RepoeServiceOptions.cache` takes. |

### Not exported

`call`, `currentDay` and the defaults in `config.ts` are internal. A raw request cannot be
built from outside the package.

## Examples

### Read every base

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const bases = await repoe.getBaseItems();

console.log(Object.keys(bases).length);
// every base the client can show

const chaos = bases["Metadata/Items/Currency/CurrencyRerollRare"];
console.log(chaos.name, chaos.properties.stack_size);
// Chaos Orb 20
```

### Keep the answer on disk

```ts
import { fileCache } from "@util/core/file-cache";
import { createRepoeService } from "@poe/repoe/service";
import type { CachedResponse } from "@poe/repoe/types";

const repoe = createRepoeService({
  cache: fileCache<CachedResponse>("cache/repoe"),
});

await repoe.getBaseItems(); // downloads the whole export
await repoe.getBaseItems(); // free, inside the same hour
```

### Every body armour a character can actually wear

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const bases = await repoe.getBaseItems();

const armours = Object.values(bases).filter(
  (item) => item.item_class === "Body Armour" && item.release_state === "released",
);

for (const item of armours.slice(0, 3)) {
  const armour = item.properties.armour;
  console.log(`${item.name}: level ${item.requirements?.level ?? 1}, armour ${armour?.min}-${armour?.max}`);
}
```

## Options

**This package reads no environment.** Nothing here touches `process.env`, there is no
`.env` to load, and every knob is an argument to `createRepoeService`.

| Option | Holds | Default |
| --- | --- | --- |
| `baseUrl` | Base of the RePoE site, trailing slash stripped | `https://repoe-fork.github.io` |
| `userAgent` | `user-agent` sent on every request | `poe-stuff/1.0` |
| `cache` | A `ResponseCache` answering calls from previous ones. Its presence is the whole switch | absent — every call re-downloads |

`userAgent` has a default here, unlike `@poe/ggg`, because a static site on GitHub Pages
publishes no requirement about it.

## Gotchas

- **The whole export in one request, with no way to ask for less.** There is no query and
  no partial fetch. Hand the service a cache or pay for the whole file every time.
- **`item_class` is GGG's internal name, not the `Class` a `.filter` matches on.** The
  export mixes the two conventions in one field: `Body Armour` and `Active Skill Gem` have
  spaces, `StackableCurrency` and `AbyssJewel` do not. Nothing here maps them onto the
  display names the client shows, and a filter cannot be built from this field alone.
- **`name` is not unique and is sometimes empty.** Two rows can share a name, and some
  carry `""` — those are `StackableCurrency` placeholders such as
  `Metadata/Items/Currency/RandomFossilOutcome1`. The metadata id is the key; the name is a
  label.
- **The file is not a drop table.** It holds unreleased rows, rows that exist only as a
  unique's base, and legacy ones. `release_state` is what separates them from `released`.
- **Every `properties` key is present on every row, and null on most.** A flask carries no
  `attack_time`, a wand carries no `charges_max`, and both objects have both keys. Read
  `item_class` and `tags` to know which ones mean anything.
- **`skills_granted` is null on every row and is typed `null`.** RePoE exports the key and
  fills nothing. `grants_buff` is filled on utility flasks only.
- **The cache expires by key, not by age.** The hour is part of every key, so an entry is
  only read back inside the hour that wrote it. RePoE only moves when GGG ships a patch, so
  an hour is already finer than the data changes. Old files are never deleted, they only
  stop being asked for.
- **No limiter, and no retry.** No rate limits are published and the call is one request
  for one file, so a failure is thrown rather than nursed — asking again is the caller's
  decision.

## How to run

Type-check the workspace:

```bash
yarn typecheck
```
