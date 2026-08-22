# The filter pipeline

Three phases, run in order by `pipeline-cli.ts`, each leaving a file the next one reads.

```bash
yarn filter
```

| Phase | CLI | Reads | Writes |
| --- | --- | --- | --- |
| 1. classify | `classify-cli.ts` | five APIs, through the hour caches | `buckets-draft.json` |
| 2. filter | `filter-cli.ts` | `buckets-draft.json` | `proto.filter` |
| 3. style | `style-cli.ts` | `proto.filter`, `styles.ts` | `poe-stuff.filter`, and a copy in the game folder |

Phase one fetches the league and turns a market into buckets. Phase two turns buckets into
blocks and checks that the finished file answers for each of them with the tier the bucket
asked for. Phase three reads the `#@` note off every block and writes in the colours, the
sound, the beam and the minimap icon that its tier and verb ask for.

A bucket some other block shadows is a filter that shows the wrong thing, and the only
place to fix it is the classifier. So phase three is skipped outright when phase two fails
— not run and left uninstalled, skipped — because the file it would draw and drop in the
game folder is that same wrong file. The exit code is phase two's, or phase three's when
phase two was clean.

## Phase three

The proto says what a drop is worth and nothing about how to draw it. `style-filter.ts`
patches it as text rather than parsing and rewriting it: the conditions come across
verbatim, comments and all, and the action lines are spliced in above each block's `#@`
line so the note stays last. `styles.md` is the table it reads.

It checks itself before it installs. The styled file is parsed back and compared to the
proto block for block — same keyword, same conditions, same notes — because an action
cannot change what an item matches, so anything that moved is a bug in the styler.

### The two blocks it adds

The proto ends at its last bucket. A filter cannot, so the styler appends the tail
NeverSink's does, in his order:

1. **The hide layer.** One `Hide` on 36 equipment classes. Everything worth showing was
   claimed by a block above — an ilvl 84 base has its own — so what reaches here is a rare
   Vaal Regalia nothing priced, which is the floor noise a filter exists to remove. It
   cannot shadow a bucket: every block that claims one is more specific and written first.
2. **The catch-all.** Loud magenta, `Show`. What gets this far is neither priced nor gear —
   a currency the league added, a base type GGG renamed. It means the filter is stale or
   the generator is wrong, and it is drawn to be impossible to miss.

Only the first is a decision about play. Without it the catch-all catches the whole game
and every rare on the floor is painted in the colour that means *something has gone wrong*.

The copy lands in `%USERPROFILE%\Documents\My Games\Path of Exile\poe-stuff.filter`, which
is where the game reads filters from. A machine with no such folder has no game on it, so
nothing is installed and nothing fails. `--no-install` skips it; `--game-dir` points it
somewhere else.

## Why separate processes

`filter-cli.ts --classify` does the first two phases in one run, and holds the buckets in
memory. Nothing else can read them afterwards — so serving the tier board, or emitting a
second time, means fetching the league again.

Running the phases apart leaves every artifact on disk. After a run:

- the classifier's output can be read, diffed or sorted
- the emitter can be re-run against it with no network at all
- `serve-cli.ts` can build the board off the same buckets the filter was built from
- the styler can be re-run on its own, which is what editing `styles.ts` means in practice:
  change a colour, run phase three, reload the filter in game. No fetch, no classify

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
| `--no-install` | 3 | write the styled filter, but leave the game folder alone |
| `--game-dir` | 3 | install somewhere other than `Documents\My Games\Path of Exile` |
| `--serve` | after 3 | open the tier board, but only on a filter that verified |

**Not every lever has a flag.** `tiers.json` holds the ladders, the curated lists and two
player levers — `gambleCeiling` and `gambleExclude` — that no flag reaches yet. Everything
adjustable is inventoried in [levers.md](levers.md), which is the page to read before
putting a UI over this.

## Reloading in game

Phase three writes the styled filter into the game folder, but **the game reads a filter
once, when it is selected**. A file that changed under a running client changes nothing on
screen until the filter is re-selected in Options → UI → Item Filter.

That is the first thing to check when a block looks wrong in game and right in the file. The
second is that beams and other effects do not retro-apply to items already lying on the
ground — they need a fresh drop.

## Running one phase alone

All three CLIs stand on their own. Only the first needs `--env-file`, because only the
first goes near an API:

```bash
node --env-file=packages/filter/.env packages/filter/classify-cli.ts
```

```bash
node packages/filter/filter-cli.ts
```

```bash
node packages/filter/style-cli.ts
```

The second reads the buckets the first one wrote; the third reads the filter the second
one wrote.
