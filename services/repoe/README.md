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

Four endpoints, and each one is a whole static file with no query, no league and no partial
fetch — the export, or nothing. Nothing here draws on the GGG budget and no rate limits are
published, so there is no limiter; the cache is what makes a re-run affordable.

| Endpoint | File | Holds |
| --- | --- | --- |
| `getBaseItems` | `/base_items.json` | Every base item in the game. |
| `getGems` | `/pob-data/poe1/Gems.json` | Every gem variant, transfigured ones included. |
| `getSpectres` | `/pob-data/poe1/Spectres.json` | Every raisable monster and its stats. |
| `getEssences` | `/pob-data/poe1/Essence.json` | Every essence and the mod it forces per slot. |

**The four are separate exports and share no vocabulary.** `base_items.json` keys on
`item_class` and metadata ids; `Gems.json` keys on gem variant ids; `Essence.json` names
equipment slots as `Body Armour` and `Thrusting One Handed Sword`. Nothing here reconciles
one with another — that is the catalog's job, not the service's.

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
├── get-base-items.types.ts     # BaseItems, BaseItem, BaseItemProperties, and three helpers
├── get-gems.ts                 # GET /pob-data/poe1/Gems.json
├── get-gems.types.ts           # Gems, Gem, GemTags
├── get-spectres.ts             # GET /pob-data/poe1/Spectres.json
├── get-spectres.types.ts       # Spectres, Spectre, SpectreMod
├── get-essences.ts             # GET /pob-data/poe1/Essence.json
└── get-essences.types.ts       # Essences, Essence, EssenceMods
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@poe/repoe/service` | `createRepoeService`, `RepoeService`, `RepoeServiceOptions` | Every endpoint bound to one base URL, user agent and cache. Every option has a default. |
| `@poe/repoe/get-base-items.types` | `BaseItems`, `BaseItem`, `BaseItemProperties`, `BaseItemRequirements`, `BaseItemVisualIdentity`, `BaseItemBuff`, `DefenceRange` | `BaseItems` is a `Record` keyed by metadata id. There is no envelope — the file is the record. |
| `@poe/repoe/get-gems.types` | `Gems`, `Gem`, `GemTags` | `Gems` is a `Record` keyed by **variant** metadata id. `gameId` is the base gem and repeats across variants. |
| `@poe/repoe/get-spectres.types` | `Spectres`, `Spectre`, `SpectreMod` | `Spectres` is a `Record` keyed by monster metadata id. The stats are multipliers, not absolute numbers. |
| `@poe/repoe/get-essences.types` | `Essences`, `Essence`, `EssenceMods` | `Essences` is a `Record` keyed by currency metadata id. Four fields, none of them optional. |
| `@poe/repoe/errors` | `RepoeHttpError` | Carries `url`, `status`. |
| `@poe/repoe/types` | `RepoeContext`, `ResponseCache`, `CachedResponse` | Types only. `ResponseCache` is what `RepoeServiceOptions.cache` takes. |

### Not exported

`call`, `currentHour` and the defaults in `config.ts` are internal. A raw request cannot be
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
import { fileCache } from "@util/cache/file-cache";
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

### One row per gem, not per variant

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const gems = await repoe.getGems();

const byGem = new Map<string, string[]>();
for (const gem of Object.values(gems)) {
  byGem.set(gem.gameId, [...(byGem.get(gem.gameId) ?? []), gem.name]);
}

console.log(byGem.get("Metadata/Items/Gems/SkillGemAbsolution"));
// [ 'Absolution', 'Absolution of Inspiring' ]
```

### Support gems, which are the rows with no base type

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const gems = await repoe.getGems();

const supports = Object.values(gems).filter((gem) => gem.tags.support);
console.log(supports.every((gem) => gem.baseTypeName === undefined)); // true
```

### The toughest spectres

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const spectres = await repoe.getSpectres();

const toughest = Object.values(spectres)
  .sort((a, b) => b.life - a.life)
  .slice(0, 3);

for (const spectre of toughest) {
  console.log(`${spectre.name}: ${spectre.life}x life, ${spectre.damage}x damage`);
}
// multipliers against the monster base table, not absolute numbers
```

### What an essence forces onto a ring

```ts
import { createRepoeService } from "@poe/repoe/service";

const repoe = createRepoeService();
const essences = await repoe.getEssences();

const anger = essences["Metadata/Items/Currency/CurrencyEssenceAnger1"];
console.log(anger.name, anger.tier, anger.mods.Ring);
// Muttering Essence of Anger 2 FireDamagePercentEssence2_
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
- **The four exports share no vocabulary.** A gem is a metadata id in `base_items.json` and
  a variant id in `Gems.json`; an equipment slot is `item_class` in one file and a spelled
  out `Thrusting One Handed Sword` in another. Nothing here reconciles them.
- **`Gems.json` is keyed by the variant, not by the gem.** A transfigured gem is its own
  row, and `gameId` — the base gem it comes from — repeats across every one of its
  variants. Group by `gameId` for one entry per gem; the key is one entry per thing that
  can drop.
- **A gem's `reqStr`/`reqDex`/`reqInt` are weightings, not points.** They normally sum to
  100 and say how the level requirement splits across the attributes. A few rows break the
  sum in both directions.
- **A support gem carries no `baseTypeName`.** The field is absent on exactly the rows
  tagged `support`, so a filter built on base types has only `name` to work from for those.
  Gem `tags` are the same shape as elsewhere in the repo: a tag that does not apply is
  absent, never `false`. Same for `vaalGem`.
- **Spectre stats are multipliers, not numbers.** `life: 4.4` means 4.4 times a monster of
  that level. The monster base table those multiply is not in this file and not in this
  package, so a spectre row alone says nothing absolute. The four resistances are the
  exception and are plain percentages.
- **A spectre's `name` is not unique, and its defences are absent rather than zero.**
  Several metadata ids share one name, and a monster with no evasion has no `evasion` key
  at all. `modList` is passed through untouched — numeric-string keys, a recursive `value`,
  and nothing here that interprets it.
- **An essence's `tier` is not the number on the end of its metadata id.**
  `CurrencyEssenceAnger1` is tier 2. The id counts within a family, starting wherever that
  family's lowest tier happens to be. `type` is an index into the family list, not a name —
  read `name` for anything a person will see.
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
