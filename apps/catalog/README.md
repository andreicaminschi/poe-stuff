# apps/catalog

The bronze/silver/gold pipeline for one league and one hour. Replaces
[`packages/filterv2`](../../packages/filterv2), which is deprecated.

## Purpose

What every drawable taxonomy row is worth this hour. **The taxonomy decides which rows
exist.** The catalog invents no row and judges none. It takes the published taxonomy's
drawable rows, prices each off PoeWatch, hangs every unique off the base it rolls on, and
gathers the result into one file for whatever writes a `.filter`.

A drawable row is the taxonomy's own rule. An item is in when it is not `excluded`, not
`filterable: false`, and not replaced by an authored row. An authored row is in when it is
not `excluded`. Anything else nobody should draw, such as a quest item or a removed item,
is the taxonomy's to exclude.

## Stages

| Stage | Does | On a rerun |
| --- | --- | --- |
| bronze | Fetches every source as it answered that hour: GGG's trade item list, PoeWatch's listings, exchange ratios and corruption outcomes, and the taxonomy. Then validates what it wrote. | Reused. The hour is gone, and fetching again gives a different answer. |
| silver | The taxonomy's drawable rows, priced, with their uniques. One file per category, plus `<category>.unpriced.json` for the rows PoeWatch has no price for. | Rebuilt. |
| gold | Gathers every row into `catalog.json`, beside the category table in `catalog.categories.json`. | Rebuilt. |

`pipeline.ts` holds the list of steps, and each step's doc comment says what it does.

A catalog row is the taxonomy row's key, name, category, subcategory and base types, its
copied conditions, variants and listing, and what the catalog adds: `meanPrice`,
`lowConfidence` and `uniques`. `baseTypes` is the row's name, or an authored row's
`baseType`.

## Layout

```
.s3/catalog/run=<league>_<hour>/bronze/        what each source said
.s3/catalog/run=<league>_<hour>/silver/        one file per category, and its unpriced rows
.s3/catalog/run=<league>_<hour>/gold/          catalog.json, catalog.categories.json
.s3/catalog/run=<league>_<hour>/manifest.json  which stages finished, and the taxonomy version used
.s3/catalog/latest/<league>.catalog.json       the published catalog, a copy of one run's gold
```

**Build and publish are separate.** A build changes nothing anyone else reads. Only
`catalog:publish` does, and it copies both gold files into `latest/`.

## Environment

| Var | Holds |
| --- | --- |
| `POE_USER_AGENT` | Required. Sent on every request, and GGG wants it to name a real contact. |

It lives in `apps/catalog/.env`, which `yarn catalog` loads. The taxonomy is read from the
same `--root` the run writes to.

## Gotchas

- **`--force` overwrites the record of that hour.** Bare, it refetches every source. Named, it
  refetches only those — `--force=taxonomy` is how a newly promoted taxonomy reaches a run
  that already has bronze. The known names are `ggg`, `poewatch` and `taxonomy`.
- **The hour defaults to the last finished one** when building, because GGG answers 404 for
  the hour still running. Publishing never defaults the hour.
- **Two files per publish, one at a time.** Each write is atomic, but a failure between them
  leaves one new file beside one old one.
- **A run collected before the catalog became taxonomy-first** has RePoE and currency-hour
  files in bronze. They are ignored, and silver rebuilds in the new shape.

## How to run

Build the last finished hour:

```bash
yarn catalog --league=Allflame
```

Rebuild an hour with a newer taxonomy:

```bash
yarn catalog --league=Allflame --hour=1788292800 --force=taxonomy
```

Publish it:

```bash
yarn catalog:publish --league=Allflame --hour=1788292800
```

Compile a published taxonomy version into a `.filter`, with no fetch. Each drawable row, or
each of its variants, becomes one `Show` block holding its resolved conditions. A row is drawn
as soon as its category, its subcategory or the row itself has a condition. A row with none,
or one that cannot be written, is skipped and listed in the printed JSON with its reason:

```bash
yarn catalog:compile --taxonomy-version=3.29.1 --out=data/compiled.filter
```
