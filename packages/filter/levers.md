# Levers

Everything a player can adjust, and what moving it does.

This is the page to read before building a UI over the generator. It is written from the
code — `tiers.json` and `classify.ts` unless another file is named — and it is the contract
a settings screen would bind to.

## The one rule that shapes the UI

**Every lever is read at classify time, and nothing is adjustable afterwards.** There is no
runtime layer: moving a lever does not re-colour a finished filter, it changes which blocks
exist at all. A T3 cut that moves deletes some blocks and creates others; a click floor that
rises removes stack rungs entirely.

So the flow a UI has to implement is *set the levers, regenerate, reload in game* — not
*drag a slider and watch the file change*. The whole pipeline is three phases and takes as
long as the market fetch, which the hour caches make free on a re-run.

One consequence worth designing around: the game reads a filter **once, when it is
selected**. Writing the file is not enough — the player has to re-select it in game before
anything they changed is visible.

## Where a lever lives

| Home | What is in it | Reachable from a UI |
| --- | --- | --- |
| `tiers.json` | every lever below, the ladders, the curated lists | yes — it is data, edit and regenerate |
| CLI flags | a few of the player levers, overriding the file | yes, if the UI shells out |
| env | the league and the board's port | yes |
| `classify.ts` constants | modelling decisions | **no — see "Not levers"** |

## Player levers

The five settings a player owns. All live under `levers` in `tiers.json`.

| Lever | Type | Default | Range | Flag |
| --- | --- | --- | --- | --- |
| `minClickValue` | number, chaos | `0` | `>= 0` | `--min-click` |
| `goldPerDivine` | number, gold | `1000000` | `> 0` | `--gold-per-divine` |
| `hideUniqueMaps` | boolean | `false` | — | `--hide-unique-maps` |
| `gambleCeiling` | number, chaos | `30` | `>= 0` | none yet |
| `gambleExclude.enabled` | boolean | `false` | — | none yet |
| `gambleExclude.cutoff` | number, chaos | `100` | `> 0` | none yet |

**`minClickValue` — the least a single click may be worth.**
The one lever that hides on purpose. Everything else in the classifier serves the
show-cheap baseline; this is the player answering that a click is not free, and it is
allowed to win because nobody else can price their time. In chaos rather than divine: it is
a floor on attention, and it does not get cheaper because divine went up.

It reads differently on a stack. One click takes the whole pile, so it raises the smallest
stack worth bending for rather than hiding the currency — at 3c a Chaos Orb is not shown
until three are on the floor together. `0` disables it and is the default.

Three things override it: a rung marked `persistent`, a bucket marked `alwaysShow`, and any
item matched by `neverHidden`. A UI should say so, because a player who sets 5c and still
sees 1c scarabs has not found a bug.

**`goldPerDivine` — what a pile of gold is worth to this player.**
The one price in the file that is not a market price, because gold cannot be traded and no
feed quotes it. Stated as gold per divine because that is the direction the number is known
in — nobody has an intuition for 0.0002c. Every gold block follows from it.

**`hideUniqueMaps` — drop the unique-map treatment entirely.**
The one all-or-nothing lever, because the game leaves no middle setting: a unique map
cannot be told from its neighbours, so either every unique map is worth a look or none are.
`false` is the default, since it hides on purpose and nothing that hides on purpose is a
default here.

**`gambleCeiling` — the most a unique base may be worth and still be offered as a gamble.**
A base is marked as a vaal gamble when its dearest unique is at or under this, some unique
on it corrupts into something worth 5x its price, and it did not already earn T2 or louder
on its own. At 30c Moonstone Ring is a gamble and Heavy Belt never is, because Mageblood
shares the base.

**`gambleExclude` — let the player ignore the expensive uniques on a base.**
Off by default, because it is the one setting that can lose an item. On, uniques dearer than
`cutoff` stop counting toward the base's gamble price — so a Heavy Belt prices off
Siegebreaker at 40c with Mageblood set aside, and becomes gamble-eligible. The claim being
made is *I will recognise a Mageblood rather than vaal it by accident*.

`gambleCeiling` and `gambleExclude` have **no CLI flag yet** and are file-only.

## Ladders

One row per tier per family, under `ladders` in `tiers.json`. A UI could expose these as an
advanced panel; they are the numbers most likely to be retuned in a league.

| Ladder | Cuts | Notes |
| --- | --- | --- |
| `currency` | T0 5div, T1 0.7div, T2 0.1div, T3 0.05div, T4 click floor, T5/T6 leaguestart | div-cards share it, at stack 1 |
| `gems` | T0 5div, T1 0.7div, T2 0.1div, T3 0.05div, T4 click floor, T5 quality gate | |
| `bases` | T0 quality gate, T1 1div, T2 0.5div, T3 0.1div, T4 0.01div | thin prices disqualify a base outright |
| `uniques` | T0 5div, T1 1div, T2 50c, T3 20c, T4 catch-all | foulborn shares it, drawn purple |
| `maps` | no cuts — five named treatments | not priced at all |
| `default` | T0 10div, T1 1div, T2 0.2div, T3 0.025div, T4 0.005div | for the families `buckets/` has no doc for: misc, replicas |

Fields on a row:

| Field | Meaning |
| --- | --- |
| `cut` | the price that wins the rung. `null` means the rung is won some other way |
| `unit` | `divine` (default) or `chaos`. See below |
| `clickFloor` | this rung is won by clearing `minClickValue`, and nothing else |
| `persistent` | no click floor may hide this rung |
| `template`, `sound`, `size`, `beam`, `icon` | how the rung is drawn — see `buckets/buckets.md` |
| `gambleTemplate` | the template a gamble swaps in at this rung |

**`unit` is per row, and the split is deliberate.** A cut that says *this is a serious drop*
belongs in divine, or it re-tiers the whole game as chaos drifts. A cut that asks *is this
worth hovering over* belongs in chaos, because hovering does not get more expensive because
divine went up. So the unique ladder's top two rungs are divine and its bottom two are
chaos — a divine-denominated 20c floor silently became 60c over one league and hid every
40c unique, which is the bug this field exists to prevent.

## Curated lists

Hand-maintained data. A UI would present these as editable lists rather than numbers.

| List | Where | What |
| --- | --- | --- |
| `leagueStart.currency.T5` / `.T6` | `tiers.json` | crafting mats and scrolls shown below `untilAreaLevel`, but only while the price ladder would hide them |
| `leagueStart.untilAreaLevel` | `tiers.json` | default `68` |
| `leagueStart.gemQuality` / `.baseQuality` | `tiers.json` | `10` and `30` — the quality gates for the gem T5 and base T0 rungs |
| `neverHidden` | `tiers.json` | currency the click floor may not hide. Today: the `AllflameEmbers` group, and anything whose name contains `Scarab` |
| `check` | `tiers.json` | how a check verb is marked — text, border, beam, size, icon. Gold is the colour code of check |
| `names` | `hard-to-categorize.json` | base types whose price the filter cannot see, forced to the `varies` tier |
| `byName` / `byCategory` | `max-stacks.json` | how many of each item fit in a stack, which bounds the stack ladder |

`neverHidden` is **not** a promotion. Matched items keep the rung their own price earns and
that rung's styling; the only thing removed is the floor's veto. A 1c scarab is drawn as a
1c scarab — it is simply drawn.

## Not levers

Modelling decisions in `classify.ts`. They decide what a *word* means, and a definition that
moves between runs is not a definition. **A UI should not expose these.**

| Constant | Value | What it decides |
| --- | --- | --- |
| `MIN_DAILY_LISTINGS` | `20` | below this a row is not evidence of a price and is not read at all |
| `RATIO_THRESHOLD` | `10` | `ceiling / floor` above which a bucket's floor is lying |
| `VAAL_GAMBLE_RATIO` | `20` | how many times its price a corrupted outcome must clear to be a gamble |
| `CHECK_DISCOUNT` | `0.3` | how much of a check's ceiling counts toward its reported value |
| `T0_CEILING` | `100` div | the lottery-ticket override, and only on the `default` ladder |
| `MAX_GAMBLE_FLOOR` | `2` chaos | the old loss cap. Still used by the non-unique gamble path |
| `GOLD_FLOOR` | `3000` at T4 | the smallest gold pile that must appear |
| `EXCEPTIONAL_MIN_TIER` | `T2` | the quietest an exceptional gem may be tiered |

`MIN_DAILY_LISTINGS` is the one that most looks like a lever and is not: it decides which
rows are read at all, so it cannot move without re-running the classifier, and it is the
only rule in the file that overrides the show-cheap baseline. Rows the Currency Exchange
priced are exempt — that is a real book, where low volume means scarce rather than fake.

## Flags and env

| Flag | Phase | What |
| --- | --- | --- |
| `--league` | 1 | the league to classify, over `POE_WATCH_LEAGUE` |
| `--min-click` | 1 | see above |
| `--gold-per-divine` | 1 | see above |
| `--hide-unique-maps` | 1 | see above |
| `--in`, `--out` | 1–3 | artifact paths. `pipeline-cli.ts` owns these and drops any it is given |
| `--no-install` | 3 | write the styled filter but leave the game folder alone |
| `--game-dir` | 3 | install somewhere other than `Documents\My Games\Path of Exile` |
| `--serve` | after 3 | open the tier board, only on a filter that verified |

| Env | Read by | What |
| --- | --- | --- |
| `POE_WATCH_LEAGUE` | phase 1 | the league, when no `--league` is given |
| `FILTER_PORT` | `serve-cli.ts` | the tier board's port, default 8123 |

The cache directories are in the root `CLAUDE.md`; they change nothing about the output.

## What a UI still needs

Gaps between this page and a settings screen, in the order they bite:

1. **`gambleCeiling` and `gambleExclude` have no flag.** A UI shelling out to the CLI cannot
   set them without writing `tiers.json` first.
2. **No lever is validated as a set.** Nothing checks that a ladder's cuts descend, or that
   a click floor sits below the lowest cut. A UI should validate before regenerating, or
   the player gets a filter with a block that cannot fire.
3. **No preview.** The only way to see what a lever did is to regenerate and read
   `buckets-draft.json` or the tier board. A UI wanting live feedback needs the classifier
   callable in-process — it already is, via `classify()`.
