# poe-stuff

A filter engine for Path of Exile 1. It reads what every item is worth and writes a styled
`.filter` file that the game loads.

The goal is a filter that needs little upkeep. Prices move every hour, and the filter
follows them without anyone re-tiering items by hand. A player changes the filter during
play with minimal effort: the file rewrites itself, and the player reloads it in the game.

This file describes the product: its parts, how data moves between them, and what is not
decided yet. It is written for whoever builds the next part, a person or a model. Code
rules, folder layout and commands are in [CLAUDE.md](CLAUDE.md). Each package's README
holds its own detail.

## Governing laws

Three rules decide what goes into the taxonomy, and so what the filter can show:

1. The filter only deals with items that can drop on the ground. If an item can never drop,
   like a double-corrupted item, leave it out.
2. Items with a market price come first. Each one needs conditions that match only that item,
   and a listing to price it.
3. Items without a price still count if they can drop. Keep them in, and mark them
   `unpriceable` instead of excluding them.

## Status

| Part | State |
| --- | --- |
| Taxonomy | Built. The maintainer edits and publishes it in the admin panel. |
| Catalog | Built. A person starts each build, for one league and one hour. Nothing schedules it yet. |
| Admin panel | Built. The maintainer's desktop tool for the taxonomy and the catalog. |
| Generator | Not started. The design is only partly decided. |
| Collector | Not started. It needs a job queue and a record of outstanding work first. |
| AWS | Not started. Everything runs on one local machine. |

## The pipeline

```
RePoE ──────────────► taxonomy ──► catalog ──► generator ──► .filter
                                     ▲         (player's      (the game
PoeWatch ────────────────────────────┤          machine)       reads it)
GGG trade item list ─────────────────┤
collector (planned) ─────────────────┘
```

Each stage answers one question and knows nothing about the stages after it.

| Stage | Question | Who runs it |
| --- | --- | --- |
| Taxonomy | What is this item, which category holds it, and which `.filter` conditions select it? | The maintainer, whenever the classification changes |
| Catalog | What is each taxonomy row worth right now? | The backend. Planned hourly, started by hand today |
| Generator | How loudly does the filter draw each item? | The player, on their own machine, for each new catalog |

## Taxonomy

The taxonomy is the filter's own classification of the game's items. It is a metadata
authoring tool. It does not care how an item looks in the filter.

It answers two questions for every item:

1. **What is it?** A category, and optionally a subcategory. The key is the game's
   metadata id, such as `Metadata/Items/Currency/CurrencyDelveCraftingMinionsAuras`.
2. **How does a `.filter` select it?** Structured conditions, authored on the category,
   the subcategory, the item or a variant.

The generator uses both answers. Categories group the items. Conditions become the
`.filter` lines that select them.

### Where rows come from

The first version is seeded from RePoE, the game's own data files: one row per base item
and per transfigured gem. Seeds also write variants from RePoE, such as gem levels and
cluster jewel enchants. The maintainer edits the result.

Three edits change what the sources report:

- **Exclude** a row with `excluded: true`. An excluded row never reaches the catalog.
  `filterable: false` does the same for a row the game client refuses to name in a filter.
- **Add variants** to a row. One row expands into several forms, and each variant has its
  own conditions and its own price. Example: a gem at level 20, and the same gem at level
  21 and corrupted.
- **Author** a row the sources do not give in a usable form. Examples: gold, and new items
  in the first days after a patch, before RePoE has datamined them. An authored row is
  keyed `authored/<slug>` and must give a `reason`. With `replaces`, it also stands in for
  several rows that a filter cannot tell apart.

### Categories

The category table is a flattened tree. The key is the path: `map`, and `map/blighted`
below it. The tree is one level deep, category and subcategory, and never deeper.

| Field | Holds |
| --- | --- |
| `conditions` | The conditions every row under this path shares. |
| `name` | Optional. A display name for the path. |
| `tiering` | Optional. `chaos` or `stack-size`. Absent means `chaos`. |

`tiering` says what a category's tier floors count. In a `chaos` category, a floor is a
price, and the generator compares a row's price against it. In a `stack-size` category, a
floor is a `StackSize` line written into the block. Gold uses `stack-size`, because nothing
publishes a chaos value for gold.

A category path with no record adds no conditions. Conditions are written by hand, so many
categories start with none.

### Conditions

A condition is structured data. No file holds a line of filter text.

```json
{ "condition": "BaseType", "operator": "==", "from": "name" }
{ "condition": "Class", "operator": "==", "value": ["Maps"] }
{ "condition": "BlightedMap", "value": true }
{ "condition": "BaseType", "operator": "==", "value": null }
```

- `value` is a literal. `null` removes a condition that an earlier level authored.
- `from` reads the value off the row. It is `name` or `baseTypes`.
- A condition carries `value` or `from`, never both.

Four levels apply in order: category, subcategory, item, variant. A later level replaces an
earlier condition that has the same `condition` and the same `operator`. A row gets a block
as soon as any level has a condition. A row with none has no block yet.
[apps/taxonomy/README.md](apps/taxonomy/README.md) holds the full language and what the
validator refuses.

### The taxonomy also picks the price

A row or a variant names the PoeWatch listing that prices it, with a `listing` match in
PoeWatch's own field names:

```json
{ "name": "level 6",
  "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 6 } ],
  "listing": { "gemLevel": 6, "gemQuality": 20, "gemIsCorrupted": false } }
```

The same fact is written twice on purpose. The condition is what the filter asks of an item
on the ground. The `listing` is which market row gives the price. Publishing leaves out a
row with no `listing`, unless the row is excluded, is a quest item, is unpriceable, or has a variant with one.

### Versions

A version is named like `3.29.4`: the game patch, then a counter that never repeats.

1. `create` copies a published version into a new draft.
2. The maintainer edits the draft in the admin panel. Only the newest draft can be edited
   or published.
3. `publish` validates the draft and writes it. A published version never changes. A fix is
   the next version.
4. `promote` copies a published version to `latest`.

A draft is edited as `items.json`, `categories.json`, and a seeded and a manual file for
each of authored rows and variants. It is published as `<v>.json`, the merged rows, and
`<v>.categories.json`, the category table.

**`.s3/taxonomy/` is the only copy.** It is not in git, and nothing backs it up.

Code: `apps/taxonomy` writes versions. `services/taxonomy` reads a published version.
`apps/admin-panel` edits drafts.

## Catalog

The catalog attaches prices to the taxonomy's rows. One build covers one league and one
hour. The plan is a new build every hour. Today a person starts each build, with
`yarn catalog` or from the admin panel.

**The taxonomy decides which rows exist.** The catalog adds no row and removes none. Its
rows are the published taxonomy's drawable rows: every row that is not excluded, not
`filterable: false`, and not replaced by an authored row.

### Stages

| Stage | Does | On a rebuild |
| --- | --- | --- |
| bronze | Saves what each source said that hour: PoeWatch's listings, exchange prices and corruption outcomes, GGG's trade item list, and the taxonomy. Then checks what it saved. | Kept, because a new fetch gives a different answer. `--force` fetches again. |
| silver | Prices the rows and attaches the uniques. Writes one file per category, plus a file of the rows with no price. | Rebuilt. |
| gold | Writes every row to `catalog.json`, and the category table to `catalog.categories.json`. | Rebuilt. |

A manifest records which stages finished and which taxonomy version the run used. That is
the promoted version, unless `--taxonomy-version` names another.

### Prices

- Every price is in chaos, in `meanPrice`.
- **The exchange comes first.** A row the Currency Exchange trades takes PoeWatch's
  exchange price. That price is a volume-weighted mean of real trades.
- **Listings come second.** Any other row takes the mean asking price of the PoeWatch
  listing its `listing` match selects. When several listings match, the most-listed one
  wins. A row linked to several listings takes the dearest.
- Variants always price from listings, because the exchange has no per-form rows.
- A listing price is what sellers ask, not what buyers pay. Treat it as an upper bound.
- `lowConfidence` is PoeWatch's own flag. A small sample or a high variance stands behind
  that price.
- A row with variants has no price of its own. Each variant has one instead. Read one place
  or the other, never both.
- A row can have no price at all. It is still in the catalog.

### Uniques

A unique is not a row. On the ground, a unique is its base type with a rarity, and a filter
selects the base type. So the catalog attaches every unique PoeWatch lists to the row of its
base type, under `uniques`. GGG's trade item list says which base type each unique drops as.

`uniques` is a list of groups. One group holds every listing filed under one category path:
`unique` for plain uniques, `unique/foulborn` for foulborn ones. Each listing is one priced
form, such as `Lightpoacher (2 Sockets)` and `Lightpoacher (1 Socket)`. A corrupted entry is
one corruption outcome of the listing before it.

The group's path is where the taxonomy authors the conditions that tell those uniques apart
on the ground.

### The row

`catalog.json` is an array of rows. The shape is `Item` in
[apps/catalog/item.ts](apps/catalog/item.ts).

| Field | Holds |
| --- | --- |
| `key` | The taxonomy key: a metadata id, or `authored/<slug>`. |
| `name` | The row's name. Prices and conditions read this. |
| `displayName` | Optional. The maintainer's internal name. Nothing prices or resolves by it. |
| `category`, `subcategory` | The row's path. `subcategory` is `null` when the row sits directly in the category. |
| `baseTypes` | What a filter writes for `BaseType`: the row's name, or an authored row's `baseType`. |
| `quest` | Optional. `true` on a quest item. A quest item needs no listing, so it often has no price. |
| `unpriceable` | Optional. `true` on an item no market prices but that can drop. It needs no listing and has no price. |
| `conditions` | Optional. The row's own conditions, copied from the taxonomy and **not resolved**. |
| `variants` | Optional. Each has `name`, `conditions`, an optional `listing`, and its own `meanPrice` and `lowConfidence`. |
| `listing` | Optional. The PoeWatch match that prices the row. |
| `meanPrice` | Optional. Chaos. Absent on a row with variants, and on a row with no price. |
| `lowConfidence` | Optional. PoeWatch's flag on the listing `meanPrice` came from. |
| `uniques` | Optional. The groups of priced unique forms. |

`catalog.categories.json` is the taxonomy's category table, keyed by path, without items. It
is copied unchanged from the taxonomy version the run used. So a catalog's rows and
categories always come from one version.

An app is never imported by another app. A consumer of `catalog.json` declares the row shape
it reads itself.

### Where it lands

```
.s3/catalog/run=<league>_<hour>/bronze/               what each source said
.s3/catalog/run=<league>_<hour>/silver/               one file per category
.s3/catalog/run=<league>_<hour>/gold/                 catalog.json, catalog.categories.json
.s3/catalog/run=<league>_<hour>/manifest.json         stages finished, taxonomy version
.s3/catalog/latest/<league>.catalog.json              the published rows
.s3/catalog/latest/<league>.catalog.categories.json   the published categories
```

`<league>` is a lowercase slug, such as `allflame`. `<hour>` is unix seconds on the hour, in
UTC. A build defaults to the last finished hour.

**A build changes nothing that anyone reads. Only publishing does.** `yarn catalog:publish`
copies one run's gold files into `latest/`. It writes them one after the other. A failure
between the writes leaves a new file beside an old one, and nothing detects it.

Code: `apps/catalog`.

## Generator

The generator is the player's Electron app, in `apps/generator`. **It does not exist yet**,
and its design is only partly decided.

An earlier proof of concept lived in the same folder and was deleted. It compared tier
floors in chaos only, so a category whose tiers count stack sizes did not fit. Its decisions
about the game are kept in the Filter section of [TODO.md](TODO.md). Read that section
before the generator tiers anything.

### What is decided

1. **Input.** It downloads `catalog.json` and `catalog.categories.json` for one league.
2. **Buckets.** The player defines buckets inside each category. A rule puts each item into
   one bucket. The first rule type is a price threshold in chaos.
3. **Visual identity.** The player sets a look for each pair of category and bucket. The
   category gives the base, for example yellow text. The bucket changes it, for example
   with a gold border. A look is made of the `.filter` style actions: text, border and
   background colour, font size, alert sound, minimap icon and beam.
4. **Conditions.** The taxonomy's conditions say which items a block selects. The generator
   resolves them with `@poe/filter-compile`. A bucket may add a condition of its own, such
   as `StackSize` in a `stack-size` category.
5. **Output.** One standalone `.filter` file. It imports no other filter.
6. **Updates.** When a new catalog arrives, the generator rewrites the file. The player
   reloads the filter in the game.

NeverSink's filter is a reference for how a good filter looks and behaves. The generated
filter does not import it and does not build on it.

### How conditions become lines

[apps/catalog/compile-filter.ts](apps/catalog/compile-filter.ts) already writes an unstyled
filter from the taxonomy. It is the reference for how the generator reads conditions:

```ts
import { conditionLine } from "@poe/filter-compile/condition-line";
import { resolveForms } from "@poe/filter-compile/resolve-row";

const forms = resolveForms(
  categories,
  {
    name: row.name,
    baseTypes: row.baseTypes,
    category: row.category,
    subcategory: row.subcategory,
    conditions: row.conditions ?? [],
  },
  row.variants,
);

for (const form of forms) {
  const lines = form.conditions.map(conditionLine); // { line } or { problem }
}
```

`categories` is the record from `catalog.categories.json`. `resolveForms` returns one form
for a plain row, or one per variant. A form lists its `problems`, and a form with a problem
or with no conditions gets no block. `yarn catalog:compile` writes that unstyled filter. The
admin panel uses it to find the lines the game client rejects.

### Checking the output

`@poe/filter-eval` parses a `.filter` and says which block takes an item. It shares no code
with any writer, so it is an independent check. Its rules for a generated filter:

- Every block ends with a `#@` note, such as `#@ tier=T0 verb=take`. The note vocabulary
  (`tier`, `verb`, `family`) comes from the deleted proof of concept and may not fit the new
  buckets. `APPLY_KEYS` in `@poe/filter-eval/filter-ast` is where it changes.
- `Import` is not supported. The output is one file.
- Use `==` for an exact base type. `BaseType "Gold"` also matches `Gold Ring`.

Every line must also be valid in [docs/item-filter-syntax.md](docs/item-filter-syntax.md),
the `.filter` grammar as GGG documents it. [lib/filter-eval/README.md](lib/filter-eval/README.md)
is the full contract.

### What is not decided

- Rule types beyond a chaos price threshold.
- How a `stack-size` category, such as gold, gets its buckets.
- Which price puts a unique group, with one price per form, into a bucket.
- Where the generator finds a new catalog, and how it tells that one is new. The published
  files carry no league, hour or taxonomy version. The manifest has them, and publishing
  does not copy it.
- Levelling rules. Planned, but not for the first version.

[docs/backlog.md](docs/backlog.md) holds generator ideas nobody has started, such as a
toggle for low-confidence prices and an "always show" switch per category.

## Collector and the GGG service

Some prices are not published anywhere. The collector will get them from GGG's trade API,
and the catalog will read the results as one more price source. No queries are defined yet.

GGG restricts a client that sends too many requests, for a set time. `@poe/ggg` sends every
request through one rate limiter, and the limit headers on each response keep it up to date.
The collector is the main reason `@poe/ggg` exists, and the only part that sends enough
requests for the limiter to matter. The catalog calls GGG once per collected hour, for the
trade site's item list.

**One limiter is one IP address.** Two limiters in one process spend one budget twice as
fast. Search and fetch are the exception: GGG meters them apart, so they take one service
each. `@poe/ggg` cannot choose the address a request leaves from. The plan is one collector
per EC2 instance, each instance with its own public IP.

Before it can be written:

- It needs a job queue and a record of outstanding work. The proof of concept used Redis and
  Postgres, and nothing replaces them yet.
- Nothing decides whether the catalog reads the collected pages itself, or a separate step
  turns them into prices first.

Code: `apps/collector` is a README only. `packages/workers` is the deprecated proof of
concept, and its `docs/pipeline.md` is the collection design in full.

## Where it runs

Today everything runs on one local machine. `./.s3` stands in for object storage, and
`@poe/lake` reads and writes it. The admin panel and the CLIs run from the checkout.

Later the backend moves to AWS:

- The taxonomy and catalog files move to S3.
- The generator downloads the published catalog from S3.
- The collectors run on EC2.

The audience is small.

Three things must change for AWS:

- `@poe/lake` writes atomically by renaming a file. S3 has no rename.
- `@poe/taxonomy` reads a local folder and nothing else.
- Each app builds the same lake keys from its own code, and nothing checks that they agree.

The admin panel is ready by design. Its window never learns where a file is stored, so only
its `api/` adapters change.

The code is split by where it runs. `services/` wraps one outside API each. `lib/` is pure,
and the generator can import it. `apps/` have a `main()`, read their own environment, and are
never imported. [CLAUDE.md](CLAUDE.md) has the full rule.

## Parts

| Package | Role |
| --- | --- |
| `apps/taxonomy` | Seeds, validates, publishes and promotes taxonomy versions. |
| `apps/catalog` | Builds and publishes the catalog. Also `catalog:compile`, the unstyled test filter. |
| `apps/admin-panel` | The maintainer's Electron app over the taxonomy and the catalog. |
| `apps/item-inspect` | Takes an item's copied text and shows how the parser read it. |
| `apps/collector` | Planned. A README only. |
| `apps/generator` | Planned. Does not exist. |
| `lib/filter-compile` | Resolves a row's conditions and writes them as `.filter` lines. |
| `lib/filter-eval` | Parses a `.filter` and says which block takes an item. |
| `lib/item-parser` | Reads one item's copied text into the shape `@poe/filter-eval` asks about. |
| `lib/cache` | Cache keys, and a JSON file cache every service uses. |
| `lib/env` | The only reader of `process.env`. Apps only. |
| `services/ggg` | GGG's trade API behind the rate limiter. |
| `services/poe-watch` | PoeWatch's league-wide price digests. The catalog's price source. |
| `services/poe-ninja` | poe.ninja's economy API. Nothing reads it yet. |
| `services/repoe` | The game's own data files. Seeds the taxonomy. |
| `services/taxonomy` | Reads one published taxonomy version. |
| `services/lake` | JSON files under `.s3`, addressed by key. |
| `packages/*` | Deprecated proofs of concept. Never import them. |

## Words

| Word | Meaning |
| --- | --- |
| Row | One taxonomy item, keyed by metadata id or `authored/<slug>`. |
| Drawable row | A row that is not excluded, not `filterable: false`, and not replaced. Only these reach the catalog. |
| Variant | One form of a row, with its own conditions and its own price. |
| Category path | `category` or `category/subcategory`. The key of a category record. |
| Condition | One structured `.filter` condition, authored in the taxonomy. |
| Form | A row or one of its variants, with its conditions resolved. `catalog:compile` writes one block per form. |
| Tiering | What a category's floors count: `chaos` or `stack-size`. |
| Bucket | A player-defined group of items inside one category, chosen by a rule. |
| Visual identity | The look of one category and bucket pair. |
| League-hour | One league at one hour. One catalog build covers one league-hour. |
| Base type | The item a unique drops as, and what `BaseType` matches. |

## Read next

- [CLAUDE.md](CLAUDE.md): code rules, layout and commands.
- [apps/taxonomy/README.md](apps/taxonomy/README.md): the condition language and the version rules.
- [apps/catalog/README.md](apps/catalog/README.md): the pipeline and its gotchas.
- [lib/filter-eval/README.md](lib/filter-eval/README.md): what a generated filter must satisfy.
- [docs/item-filter-syntax.md](docs/item-filter-syntax.md): the `.filter` grammar.
- [TODO.md](TODO.md): deferred decisions, including the game decisions for tiering.
- [techdebt.md](techdebt.md): what the repo knowingly duplicates or does not do yet.
- [docs/backlog.md](docs/backlog.md): ideas nobody has started.
