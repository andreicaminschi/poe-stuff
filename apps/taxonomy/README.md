# @poe/taxonomy-app

The hand-maintained classification table, published a version at a time.

## Purpose

Two questions nothing else in the tree can answer:

- **What is this item?** A category and a subcategory per metadata id, plus the handful of
  overrides where the game's data and the trade site are both wrong about a row.
- **How does a `.filter` name it?** A condition set per category, per subcategory and, where
  it differs, per item.

`apps/catalog` never reads this app. It reads what this app published, through
`@poe/taxonomy`, exactly the way it reads GGG or RePoE — the taxonomy is a third party that
we happen to write ourselves.

## Structure

```
apps/taxonomy/
├── versions/3.29.json             # items: one entry per metadata id
├── versions/3.29.categories.json  # categories: the flattened tree, one entry per path
├── versions/3.29.authored.manual.json  # rows no source produces, keyed authored/<slug>, a person's
├── versions/3.29.authored.seeded.json  # the same, the seed's. Never edited by hand
├── versions/3.29.variants.manual.json  # variants a person wrote, keyed like the row they belong to
├── versions/3.29.variants.seeded.json  # variants the seed wrote. Never edited by hand
├── versions.ts                    # loads and validates one version's six files
├── seed-taxonomy.ts               # every seed, run at once: the game's data -> the two .seeded.json
├── seed-taxonomy/                 # one seed per class: gem-variants, cluster-jewels
├── validate-table.ts              # an item entry is well formed
├── validate-conditions.ts         # a condition list is well formed, and a category path
├── validate-authored.ts           # an authored row is well formed and keyed under authored/
├── validate-variants.ts           # a variant list is well formed and names a real row
├── publish-taxonomy.ts            # write a version into the lake, once
├── promote-taxonomy.ts            # point latest at a version
├── lake.ts                        # this app's lake, not the catalog's
├── types.ts                       # AuthoredEntry, AuthoredCategory, Condition, Version
├── taxonomy-cli.ts                # publish | republish | promote
└── seed-taxonomy-cli.ts           # seed
```

**A version is six files and one published object.** The items are thousands of rows, the
categories are dozens, and the authored rows and the variants are two files each — the
seeded and the manual; keeping them apart means reaching any of the small ones without
scrolling past every item. `publish` writes `{ version, items, categories, authored }` as one
file, each pair merged, with each row's variants folded onto its entry.

## Categories

`versions/<version>.categories.json` is a **flattened tree**. The key is the path, and the
path is the only thing that makes one record the parent of another:

```json
{
  "map":              { "conditions": [ { "condition": "BaseType", "operator": "==", "from": "name" } ] },
  "map/blighted":     { "conditions": [ ... ] },
  "map/blight-ravaged": { "conditions": [ ... ] }
}
```

One level of nesting and no more, because a row is filed under a category and a subcategory
and nothing deeper.

**A category record does two jobs.** It is the default for its own rows — the ones with no
subcategory — and the parent of its children. Five categories today have both: `base-type`,
`currency`, `flask`, `map` and `valdo-map`.

**A category in use with no record throws at resolution.** Every row under it would
otherwise vanish from the generated filter with nothing saying so.

**A category says what its tier floors count.** `tiering` is `chaos` or `stack-size`, and
absent means `chaos` — 89 of the 90 categories, where a floor is a price and the catalog
prices the row. `gold` is the exception: gold has a Chaos value that nothing publishes and
nobody wants to maintain, so its rungs count the size of the stack on the floor instead.
The difference is not the unit. A Chaos floor is a number something compares a price
against; a stack-size floor is a `StackSize` line something writes into the block.

## The condition language

A condition is structured. Nothing anywhere holds a line of filter text.

```json
{ "condition": "BlightedMap", "value": true }
{ "condition": "Class",    "operator": "==", "value": ["Maps"] }
{ "condition": "BaseType", "operator": "==", "from": "name" }
{ "condition": "BaseType", "operator": "==", "value": null }
```

| Field | Means |
| --- | --- |
| `condition` | The `.filter` condition name, spelled as [docs/item-filter-syntax.md](../../docs/item-filter-syntax.md) spells it. |
| `operator` | Defaults to `==`. Present so `MapTier >= 11` and `GemLevel >= 20` can be written when they are needed. |
| `value` | A literal: string, number, boolean, or list of strings. **`null` removes** the condition an earlier level authored. |
| `from` | Reads the value off the catalog row instead. `name` or `baseTypes`, and nothing else. |

`value` and `from` are the two ways to say the same thing, so a condition carries exactly one
of them.

### Composition

Four levels, applied in order, each overriding the one before it:

```
category  ->  subcategory  ->  item  ->  variant
```

A condition is replaced when a later level authors the same `condition` **and the same
`operator`**. Operator is half the key because `MapTier >= 11` and `MapTier <= 15` are one
name and two conditions.

```
category   base-type          —
subcat     base-type/amulet   BaseType == from:name
item       Agate Amulet       —

                              ->  BaseType == "Agate Amulet"
```

Removing is how a category that names its rows makes room for one that does not:

```
category   map                BaseType == from:name
subcat     map/blighted       Class       == ["Maps"]
                              BlightedMap == true
                              BaseType    == null

                              ->  Class == "Maps"
                                  BlightedMap True
```

### Do not author `Class` beside `BaseType`

`BaseType ==` is an exact match, and no filterable name in the catalog needs a class to
disambiguate — the 59 names that span two internal classes all collapse to one filter class.
A record carrying both is rejected, and a removal does not count as authoring one.

The effect is that `Class` appears only where a record names nothing: `map/blighted`,
`map/blight-ravaged`, `skill-gem/transfigured`. It also means a subcategory holding two
classes — `base-type/one-handed-mace` is 28 sceptres and 28 maces — needs no attention at
all.

### Variants

An item can carry several priced variants. **A price attaches to a variant, not to an item**,
so an item with variants resolves once per variant and not once for itself.

They are keyed by the same metadata id the items file uses, or by an authored row's key.
Every key must name a row in the version, and a list may not be empty.

**The two are exclusive.** A row without variants carries a `meanPrice` of its own. A row
with variants carries none, and each variant carries its own instead. A consumer reads one
place or the other, never both, and a row with variants and no price is priced rather than
missing. Empower Support is a level 1 at 320c and a level 4 corrupted at 4,500c, and no
single number is the price of an Empower.

**A unique is not a row, and has no variants here.** On the ground a unique is its base
with a rarity, and a filter names the base; so the catalog hangs every unique PoeWatch lists
off the base it rolls on, under `uniques`, one entry per listed form — `Lightpoacher (2
Sockets)` at 140c and `(1 Socket)` at 1c are two entries on Great Crown. The items table
still carries a unique's `base:Name` key under `unique-*`, and a variant keyed by one
validates and lands on no row. How a person says which of a unique's forms a filter can
name is an open question, in `TODO.md`.

### Seeded and manual

Variants come from two files, and the version is their merge.
`versions/<version>.variants.seeded.json` is written by `yarn taxonomy:seed` — every seed at
once, the whole file, every time — and is never edited by hand.
`versions/<version>.variants.manual.json` is a person's, and **a manual key replaces the
seeded list whole**: write a gem's variants there and the seeded ones for that gem are gone,
not patched. Authored rows are the same pair, `authored.seeded.json` and
`authored.manual.json`, merged the same way.

A seed reads what the game says an item can be — a gem's `naturalMaxLevel`, a cluster jewel's
enchants — off `@poe/repoe`, and nothing else. **The taxonomy never touches PoeWatch.** The
`price` selectors a seed writes are in PoeWatch's field names the way conditions are in GGG's:
a published vocabulary the catalog reads, not a service the taxonomy calls. A form nobody
lists is written anyway and stays unpriced.

Two seeds today, in `seed-taxonomy/`; a new class is a new file there and a line in
`SEEDS`. Two seeds may write variants on one key, and their lists are joined; a variant name
both wrote is a repeat and fails validation. A seed may also write authored rows, into
`authored.seeded.json`; two seeds writing one row throws.

- **Gems.** `1/0`, `1/20`, `L/20`, and the four a Vaal Orb makes of the max — `L/20`,
  `L+1/20`, `L/23`, `L+1/23`, corrupted. A Vaal gem cannot exist uncorrupted and gets the
  corrupted five alone. `L` is RePoE's `naturalMaxLevel`.
- **Cluster jewels.** Every enchant × passive bucket × item level bucket, as variants on the
  three real rows — an enchant is a form of the jewel the way a level is a form of a gem.
  `price: { name, passives, itemLevel }`. The buckets are PoeWatch's conventions, fixed in
  the seed: small `2, 3`, medium `4, 5, 6`, large `8, 9-11, 12`; item level `1, 50, 68, 75,
  84`.

```json
"Metadata/.../SupportGemAwakenedAddedChaos": [
  { "name": "plain",   "conditions": [] },
  { "name": "level 5", "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 5 } ] },
  { "name": "level 6", "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 6 } ] }
]
```

An item that still needs a plain form writes a variant with no conditions, as above. Nothing
is implied — a variant list with only narrow members means a level 1 gem gets no block.

`publish` folds each list onto its item as `variants`, so the published entry looks the way
it always did and the catalog reads nothing new.

### Which listing prices a variant

PoeWatch lists one name many times: a gem per level and quality, an armour per link count, a
map per tier. A variant says which of those listings is its price with a `price` selector,
written in PoeWatch's own field names. A listing matches when every written key is equal on
it; among the matches, the most-listed one is read.

```json
{ "name": "level 6",
  "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 6 } ],
  "price": { "gemLevel": 6, "gemQuality": 20, "gemIsCorrupted": false } }
```

The keys are `gemLevel`, `gemQuality`, `gemIsCorrupted`, `linkCount`, `itemLevel`, `mapTier`,
`tier`, `passives`, and `name` — the listing's own name, for a row PoeWatch lists under
something other than its display name; a variant without one inherits its row's. **Absent
means the most-listed row for the name**, which is what every row without variants gets. An item without variants may carry `price` itself, for a base that
should not price at whatever form is listed most. A selector that matches nothing — a gem
key on a base — leaves the row unpriced, and is not an error.

**The fact is authored twice on purpose.** `GemLevel >= 6` is what a filter asks of an item
on the ground; `gemLevel: 6` is which listing to read a price off. The catalog copies
conditions and never reads them, and the selector keeps it that way.

## Item overrides

Beside `category` and `subcategory`, an entry may state three things the sources get wrong.
**All three are absent on almost every row, and absent means take the sources' answer.**

| Field | Says |
| --- | --- |
| `filterable` | A `.filter` cannot name this row. The client rejects `Alpine Shaman` while `Bearded Shaman` drops, and nothing but the client knows. |
| `tradable` | The trade site lists this name. RePoE marks the blighted map trade proxy untradable while the site lists 145 names against it. |
| `tradedOnExchange` | The same, for the Currency Exchange. |

`category: "excluded"` is reserved and means something else: the row is real, nameable, and
nobody wants it drawn. Everything in it lands in `excluded.json` and never reaches a
`.filterable.json`.

`original` holds what the seed said and is **never edited**. A row where the two differ is a
decision somebody made; a row where they agree has either been checked and left alone or not
been looked at yet.

## Authored rows

`versions/<version>.authored.manual.json` holds the rows no arrangement of the sources
produces, keyed `authored/<slug>` — a namespace no metadata id can collide with. The slug is
usually of the name, and need not be. **This is the only place a hand-written row is
authored.** `authored.seeded.json` beside it is the seed's — empty today — and a manual key
replaces a seeded row whole. The catalog builds the row from the entry and
from whatever `replaces` names, and copies `conditions`, `price` and variants off it the way
it does off a real row.

```json
"authored/vaal-aspect": {
  "name": "Vaal Aspect",
  "category": "currency",
  "subcategory": "maps",
  "replaces": [ "Metadata/Items/UniqueFragments/FragmentUniqueMap26_1", "..." ],
  "reason": "Four ids, one display name, and a filter can write BaseType == \"Vaal Aspect\" and nothing finer."
}
```

`replaces` names the item keys the row stands in for, and may be left out: with it, several
rows a filter cannot tell apart collapse into the one it can write; without it, the row is one
no source has at all. `reason` is required — a hand-written row with no reason records that
somebody decided, not what they decided.

## What the validator refuses

Both tables are checked before anything is published, because `tsc` never reads a `.json`
and a published version is immutable.

- An unknown field on an entry, a category, a condition or a variant.
- A condition with both `value` and `from`, or with neither.
- `from` naming anything but `name` or `baseTypes`.
- The same `condition` + `operator` twice in one list — the second would win silently.
- `Class` and `BaseType` authored in the same list.
- Two variants under one name, an empty variant list, or a variants key that is neither an
  item nor an authored row in the version.
- An authored row keyed by anything but `authored/` and a slug, with no `reason`, or with
  an empty `replaces`.
- A `price` selector with an unknown key, a wrong value type, or no keys at all.
- A category key that is not `category` or `category/subcategory`, slugged.

It fails on the first bad row and names it. The rest fail at resolution, where the row that
needed the answer can be named: an empty resolved set, a `from` that reads an empty field, a
name carrying a quote, two variants resolving identically.

## Environment

None. Everything this app touches is a file under the lake.

## Gotchas

- **A published version is immutable, and `republish` is the exception.** A league's hand
  pass is dozens of edits, each needing a run to look at, so burning a version number per
  edit would leave a shelf of versions that only existed to be replaced. Once anyone else
  reads a version, publish a new one.
- **Republishing does not reach a collected run.** Bronze is the record of what the sources
  said at that hour, and `yarn catalog` on an existing run replays silver without
  re-collecting. Delete the run, or collect a new hour.
- **`versions.ts` lists the versions.** A new league is six new files under `versions/`
  and a line in `VERSIONS` — the two `.seeded.json` start as `{}` and the seed fills them.
- **The key layout is a shared format, not shared code.** This app builds
  `taxonomy/<version>.json` from its own `lake.ts` and `@poe/taxonomy` builds the same
  string from its own `config.ts`. Changing one without the other breaks at runtime with
  nothing failing at compile time.

## How to run

Seed the version you are editing. Every seed runs, and the two `.seeded.json` files are
rewritten whole:

```bash
yarn taxonomy:seed
```

Publish the version you are editing, over the one already in the lake:

```bash
yarn taxonomy:republish
```

Publish a version for the first time, and point `latest` at it:

```bash
yarn taxonomy:publish 3.30
```

```bash
yarn taxonomy:promote 3.30
```
