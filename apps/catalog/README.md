# apps/catalog

The bronze/silver/gold pipeline for one league and one hour. Replaces
[`packages/filterv2`](../../packages/filterv2), which is deprecated.

## Purpose

One row per item a filter can draw, with what it is and what it is worth. It collects every
source for one league-hour, merges them into one row per item, classifies each against the
taxonomy, and gathers the drawable rows into one file for whatever writes a `.filter`.

## Stages

| Stage | Does | On a rerun |
| --- | --- | --- |
| bronze | Fetches every source as it answered that hour: GGG items and currency, PoeWatch, RePoE, and the taxonomy. Then validates what it wrote. | Reused. The hour is gone, and fetching again gives a different answer. |
| silver | Merges the sources into one row per item and writes a file per category. | Rebuilt. |
| gold | Gathers the drawable rows into `catalog.json` and `catalog.categories.json`. | Rebuilt. |

`pipeline.ts` holds the list of steps, and each step's doc comment says what it does.

## Layout

```
.s3/catalog/run=<league>_<hour>/bronze/        what each source said
.s3/catalog/run=<league>_<hour>/silver/        one file per category
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
  that already has bronze. The known names are `ggg`, `poewatch`, `repoe` and `taxonomy`.
- **The hour defaults to the last finished one** when building, because GGG answers 404 for
  the hour still running. Publishing never defaults the hour.
- **Two files per publish, one at a time.** Each write is atomic, but a failure between them
  leaves one new file beside one old one.

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
