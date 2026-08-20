# The filter pipeline

Two phases, run in order by `pipeline-cli.ts`, each leaving a file the next one reads.

```bash
yarn filter
```

| Phase | CLI | Reads | Writes |
| --- | --- | --- | --- |
| 1. classify | `classify-cli.ts` | five APIs, through the hour caches | `buckets-draft.json` |
| 2. filter | `filter-cli.ts` | `buckets-draft.json` | `proto.filter` |

Phase one fetches the league and turns a market into buckets. Phase two turns buckets into
blocks and checks that the finished file answers for each of them with the tier the bucket
asked for. The exit code is phase two's: a bucket some other block shadows is a filter that
shows the wrong thing, and the only place to fix it is the classifier.

## Why two processes and not one

`filter-cli.ts --classify` does the same work in one run, and holds the buckets in memory.
Nothing else can read them afterwards — so serving the tier board, or emitting a second
time, means fetching the league again.

Running the phases apart leaves both artifacts on disk. After a run:

- the classifier's output can be read, diffed or sorted
- the emitter can be re-run against it with no network at all
- `serve-cli.ts` can build the board off the same buckets the filter was built from

## What the pipeline owns

**The artifact paths.** Both CLIs spell the flag `--out` and mean different files by it, so
`pipeline-cli.ts` passes them itself and drops any `--out` or `--in` it was given.

**Which phase sees a lever.** `--league`, `--min-click`, `--gold-per-divine` and
`--hide-unique-maps` reach the classifier and stop there. By the time the emitter runs, a
lever is already baked into every bucket — the tier is a decision the classifier made and
the emitter writes it down. Forwarding them would be a knob that does nothing.

**That phase two never fetches.** It is handed `--in` and no `--classify`, so it cannot
reach the network. A re-fetch there could classify a different market than the buckets were
built from, and the two artifacts would quietly disagree.

## Refreshing

There is no `--refresh` flag. Every cache key carries the league and the hour, and PoeWatch
recomputes on the hour, so a forced re-fetch inside one hour downloads twenty megabytes to
get identical bytes back. Phase one *is* the refresh: run it in a new hour and the caches
miss on their own.

Caching is off entirely unless `POE_WATCH_CACHE_DIR`, `CACHE_DIR` and `POE_WIKI_CACHE_DIR`
name folders — unset means every run goes to the APIs.

## Flags

| Flag | Phase | What |
| --- | --- | --- |
| `--league` | 1 | the league to classify, over `POE_WATCH_LEAGUE` |
| `--min-click` | 1 | least a click may be worth, in chaos. `0` shows everything |
| `--gold-per-divine` | 1 | what a divine is worth in gold. Gold has no market price |
| `--hide-unique-maps` | 1 | drop every unique map, whatever it is worth |
| `--serve` | after 2 | open the tier board, but only on a filter that verified |

## Running one phase alone

Both CLIs stand on their own and both need `--env-file` for the APIs:

```bash
node --env-file=packages/filter/.env packages/filter/classify-cli.ts
```

```bash
node packages/filter/filter-cli.ts
```

The second needs no env: it reads the buckets the first one wrote.
