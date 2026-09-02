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
├── versions.ts                    # loads and validates one version's two files
├── validate-table.ts              # an item entry is well formed
├── validate-conditions.ts         # a condition list is well formed, and a category path
├── publish-taxonomy.ts            # write a version into the lake, once
├── promote-taxonomy.ts            # point latest at a version
├── lake.ts                        # this app's lake, not the catalog's
├── types.ts                       # AuthoredEntry, AuthoredCategory, Condition, Version
└── taxonomy-cli.ts                # publish | republish | promote
```

**A version is two files and one published object.** The items are thousands of rows and the
categories are dozens; keeping them apart means reaching the conditions without scrolling
past every item. `publish` writes `{ version, items, categories }` as one file.

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

```json
"Metadata/.../SupportGemAwakenedAddedChaos": {
  "name": "Awakened Added Chaos Damage Support",
  "variants": [
    { "name": "plain",   "conditions": [] },
    { "name": "level 5", "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 5 } ] },
    { "name": "level 6", "conditions": [ { "condition": "GemLevel", "operator": ">=", "value": 6 } ] }
  ]
}
```

An item that still needs a plain form writes a variant with no conditions, as above. Nothing
is implied — a variant list with only narrow members means a level 1 gem gets no block.

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

## What the validator refuses

Both tables are checked before anything is published, because `tsc` never reads a `.json`
and a published version is immutable.

- An unknown field on an entry, a category, a condition or a variant.
- A condition with both `value` and `from`, or with neither.
- `from` naming anything but `name` or `baseTypes`.
- The same `condition` + `operator` twice in one list — the second would win silently.
- `Class` and `BaseType` authored in the same list.
- Two variants under one name.
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
- **`versions.ts` lists the versions.** A new league is two new files under `versions/` and a
  line in `VERSIONS`.
- **The key layout is a shared format, not shared code.** This app builds
  `taxonomy/<version>.json` from its own `lake.ts` and `@poe/taxonomy` builds the same
  string from its own `config.ts`. Changing one without the other breaks at runtime with
  nothing failing at compile time.

## How to run

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
