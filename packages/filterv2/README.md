# @poe/filterv2

> **DEPRECATED.** A POC, replaced by `apps/catalog`, removed as soon as that is written.
> See [DEPRECATED.md](DEPRECATED.md). What follows describes what this package does today,
> and is kept because the merge order in it is worth copying.

Every item the game can show, named and flagged, written to one JSON file.

## Purpose

A filter cannot mention an item nobody has written down. This package builds that list —
everything a `.filter` could name — by merging the three places the truth is kept, and
marking the rows where they disagree.

Three sources, and each is the authority on something the others are not:

| Source | Owns |
| --- | --- |
| GGG `/data/items` | Everything a player can list on the trade site, by name and category. Silent about a currency until somebody lists one |
| GGG Currency Exchange | Which currencies actually traded this hour, as metadata ids. Knows a new currency hours before the trade site does, and never names it |
| RePoE `base_items.json` | The game's own export: item class, release state, tags. Lags a patch, and lags a league launch by more |

**No prices.** Nothing here asks what an item is worth — that is `@poe/poe-watch`'s half of
the problem. This answers what exists.

### The source that was removed

There was a fourth: **the league's Item Filter Information forum post**, read through
`@poe/ggg` and extracted by a `claude -p` call. It was the only source that could name an
item before it existed anywhere else, and it was what made a league launch legible — RePoE
lags one by days, and the post does not.

It was removed with the forum endpoints on `@poe/ggg`, which now covers the trade API and
the Currency Exchange CDN only. Four things went with it:

- `newLeague` and `namesMissingFromRepoe` on the output. Nothing detects a launch now.
- `isNew` and `renamedFrom` on a row, and `"forum"` as an `ItemSource`.
- This league's renames and removals. A renamed item appears under its old name until
  RePoE catches up.
- `--force-search`, `--no-forum`, `--model` and `--post-dir` on the CLI.

`data/forum-posts/` is still here — three leagues of extracted posts, one `claude -p` call
each. Nothing reads them any more; they are kept as reference for whatever answers the
forum question in `apps/catalog`.

## Structure

```
build-item-list.ts               the pipeline, top to bottom
build-item-list-cli.ts           the CLI that writes data/items.json
build-item-list.mmd              the whole flow as a diagram
types.ts                         Item, ItemsByKey, ItemsFile
build-item-list/
  collect-items.ts               GGG's two endpoints, merged. + collect-items.mmd
  fill-from-repoe.ts             the game's own data, last and winning
data/items.json                  the output
data/forum-posts/                orphaned: the removed source's stored answers
```

## Public API

| Import | Gives |
| --- | --- |
| `@poe/filterv2/build-item-list` | `buildItemList(options)` and `BuildOptions` |
| `@poe/filterv2/types` | `Item`, `ItemsByKey`, `ItemsFile`, `Market`, `blankItem`, `tagSource` |

Everything under `build-item-list/` is private by not being listed in `exports`.

## How to run

The package reads one variable, and it has no `.env` of its own until you write one:

```bash
grep POE_USER_AGENT packages/workers/.env > packages/filterv2/.env
```

Build the list:

```bash
node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts
```

Progress goes to stderr and ends with the counts:

```
item list: 15234 items
traded but absent from RePoE: 4

wrote packages/filterv2/data/items.json
15234 items: 4 absent from RePoE, 812 traded
repoeIncomplete: true
```

## Options

Every flag has a default, so the plain command above is a complete run.

| Flag | Default | Does |
| --- | --- | --- |
| `--league <name>` | `Allflame` | Which league's Currency Exchange markets to read |
| `--hour <unix>` | two hours back | Which hour of the exchange. The endpoint serves neither the hour in progress nor the one just closed |
| `--out <path>` | `packages/filterv2/data/items.json` | Where the list is written |
| `--cache-dir <path>` | `cache/repoe` | Where RePoE's export is kept between runs |

## What a run costs

| Call | When |
| --- | --- |
| RePoE `base_items.json` | Once an hour. The export is cached under `cache/repoe` keyed by the hour, so a re-run inside the hour is free |
| GGG Currency Exchange, one hour | Every run. Not cached — the point is to read a fresh hour |
| GGG `/data/items` | Every run. Not cached, and it runs after the exchange call rather than beside it: one service is one IP, and GGG counts a process's requests against one budget |

Two GGG requests and at most one download. There is no model call any more.

## Output

`data/items.json` is one object. `items` is keyed by the item's name — or by its metadata
leaf where nothing can name it yet:

```json
{
  "generatedAt": "…",
  "league": "Allflame",
  "hourId": 490000,
  "repoeIncomplete": true,
  "items": {
    "Chaos Orb": {
      "key": "Chaos Orb",
      "name": "Chaos Orb",
      "metadataPaths": ["Metadata/Items/Currency/CurrencyRerollRare"],
      "itemClass": "Stackable Currency",
      "category": "currency",
      "baseTypes": [],
      "isUnique": false,
      "releaseState": "released",
      "tags": ["currency"],
      "sources": ["items", "exchange", "repoe"],
      "tradedOnExchange": true,
      "absentInRepoe": false
    }
  }
}
```

`sources` is the useful field when a row looks wrong: it says which of the three wrote to
it.

One flag means "somebody is behind": `absentInRepoe` — the exchange traded this metadata
path and RePoE cannot name it. The row is keyed by the path's last segment and `name` is
`null`. `repoeIncomplete` is true when any row has it.

## Gotchas

- **Nothing mutates what it is given.** `Item` is `readonly` throughout and `ItemsByKey` is
  a `ReadonlyMap`, so a step returns a new list rather than filling one in. This is
  enforced by the compiler, not by review.
- **Order decides who wins.** `fillFromRepoe` runs last, so the game's own export is the
  last word on any row it recognises.
- **One GGG service for the whole run.** One service is one IP, and GGG counts a process's
  requests against one budget, so the two calls queue behind one limiter.
- **A league launch is invisible now.** RePoE lags one by days and the source that did not
  is gone, so on launch day this quietly produces last league's list plus whatever the
  exchange happens to trade.
- **Blighted maps and transfigured gems are wrong today.** See
  [notes.md](notes.md) — GGG names a variant in a field this build drops.
