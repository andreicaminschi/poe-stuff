# @poe/filterv2

Every item the game can show, named and flagged, written to one JSON file.

## Purpose

A filter cannot mention an item nobody has written down. This package builds that list —
the roster of everything a `.filter` could name — by merging the three places the truth
is kept, and marking the rows where they disagree.

Three sources, and each is the authority on something the others are not:

| Source | Owns |
| --- | --- |
| GGG `/data/items` | Everything a player can list on the trade site, by name and category. Silent about a currency until somebody lists one |
| GGG Currency Exchange | Which currencies actually traded this hour, as metadata ids. Knows a new currency hours before the trade site does, and never names it |
| RePoE `base_items.json` | The game's own export: item class, release state, tags. Lags a patch, and lags a league launch by more |
| The news forum | The Item Filter Information post: what this league renamed, removed and added. The only source that names an item before it exists anywhere else |

**No prices.** Nothing here asks what an item is worth — that is `@poe/poe-watch`'s half of
the problem. This answers what exists.

## Structure

```
build-item-list.ts               the pipeline, top to bottom
build-item-list-cli.ts           the CLI that writes data/items.json
build-item-list.mmd              the whole flow as a diagram
types.ts                         Item, ItemsByKey, ItemsFile, ProcessedPost
build-item-list/
  collect-items.ts               GGG's two endpoints, merged. + collect-items.mmd
  apply-filter-post.ts           what the forum post changes. + apply-filter-post.mmd
  rename-items.ts                "X renamed to Y"
  add-new-items.ts               names RePoE has never heard of
  fill-from-repoe.ts             the game's own data, last and winning
  detect-new-league.ts           has a league launched that RePoE has not caught up with
  sync-forum-posts.ts            the forum walk. + sync-forum-posts.mmd
  find-filter-threads.ts         thread links on a news page
  first-post-lines.ts            the first post of a thread, as text
  process-post.ts                that text, read by the model
  ask-claude.ts                  one `claude -p` call
  processed-post-files.ts        answers on disk, one file per thread
data/items.json                  the output
data/forum-posts/                one processed post per thread, plus an index
```

## Public API

| Import | Gives |
| --- | --- |
| `@poe/filterv2/build-item-list` | `buildItemList(options)` and `BuildOptions` |
| `@poe/filterv2/types` | `Item`, `ItemsByKey`, `ItemsFile`, `ForumPost`, `ProcessedPost`, `blankItem`, `tagSource` |

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

Without touching the forum or the model — GGG and RePoE only:

```bash
node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts --no-forum
```

Progress goes to stderr and ends with the counts:

```
newest post: Curse of the Allflame Item Filter Information
NEW LEAGUE: 4 of its items are not in RePoE yet
item list: 15234 items
traded but absent from RePoE: 4

wrote packages/filterv2/data/items.json
```

## Options

Every flag has a default, so the plain command above is a complete run.

| Flag | Default | Does |
| --- | --- | --- |
| `--league <name>` | `Allflame` | Which league's Currency Exchange markets to read |
| `--hour <unix>` | two hours back | Which hour of the exchange. The endpoint serves neither the hour in progress nor the one just closed |
| `--model <name>` | `sonnet` | Passed to `claude -p` when a forum post has to be read |
| `--out <path>` | `packages/filterv2/data/items.json` | Where the list is written |
| `--post-dir <path>` | `packages/filterv2/data/forum-posts` | Where processed posts are kept |
| `--cache-dir <path>` | `cache/repoe` | Where RePoE's export is kept between runs |
| `--force-search` | off | Search the forum even if it was searched within the day |
| `--no-forum` | off | Skip the forum entirely. No model call, no post applied |

## What a run costs

| Call | When |
| --- | --- |
| RePoE `base_items.json` | Once an hour. The export is cached under `cache/repoe` keyed by the hour, so a re-run inside the hour is free |
| GGG Currency Exchange, one hour | Every run. Not cached — the point is to read a fresh hour |
| GGG `/data/items` | Every run. Not cached, and it runs after the exchange call rather than beside it: one service is one IP, and GGG counts a process's requests against one budget |
| Forum news pages | Once a day, and only until the first Item Filter Information thread is found |
| One forum thread | Once a day, to check whether the post still reads as it did |
| `claude -p` | Only when that thread's text does not match the checksum stored beside the last answer. GGG edits these posts in place, which is what the checksum is for |

## Output

`data/items.json` is one object. `items` is keyed by the item's name — or by its metadata
leaf where nothing can name it yet:

```json
{
  "generatedAt": "…",
  "league": "Allflame",
  "hourId": 490000,
  "newLeague": true,
  "repoeIncomplete": true,
  "forumPost": { "threadId": 3986972, "title": "…", "url": "…" },
  "namesMissingFromRepoe": ["Reap of Butchery"],
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
      "isNew": false,
      "absentInRepoe": false
    }
  }
}
```

`sources` is the useful field when a row looks wrong: it says which of the four wrote to
it. A row with `["forum"]` alone was named by nothing but a forum post.

The two flags that mean "somebody is behind":

- `absentInRepoe` — the exchange traded this metadata path and RePoE cannot name it. The
  row is keyed by the path's last segment and `name` is `null`.
- `isNew` — the post names it and RePoE has never heard of it. `newLeague` is true when
  any row has it.

## Gotchas

- **Nothing mutates what it is given.** `Item` is `readonly` throughout and `ItemsByKey` is
  a `ReadonlyMap`, so a step returns a new list rather than filling one in. This is
  enforced by the compiler, not by review.
- **Order decides who wins.** `fillFromRepoe` runs after the forum post, so the game's own
  export is the last word on any row it recognises.
- **One GGG service for the whole run.** The forum is the same host and the same per-IP
  budget as the trade API, so it goes through the same limiter.
- **The forum walk reads one thread.** Only the newest Item Filter Information post
  answers what this league changed, and every older one costs a model call for an answer
  nothing reads.
- **Blighted maps and transfigured gems are wrong today.** See
  [notes.md](notes.md) — GGG names a variant in a field this build drops.
