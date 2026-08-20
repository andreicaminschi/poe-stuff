# Levers

Every tunable number the classifier currently holds, and what moving it does. Written from
the code, not from the design — `packages/filter/classify.ts` unless another file is named.
Line numbers are deliberately absent; grep the name.

A **lever** is a number the player owns. It says whether *this player* cares, and moving it
must never require re-pricing anything. Everything else on this page is a constant: a
modelling choice or a market fact that happens to be typed in by hand for now. The
distinction matters because the exploration doc caps the number of levers at the number of
visually distinguishable treatments — every real lever spends part of a fixed budget, and
the constants below must not quietly become knobs.

## Levers — player-owned, safe to move at runtime

| Name | Unit | Default | Applies to | Moves at runtime? |
| --- | --- | --- | --- | --- |
| `MAX_GAMBLE_FLOOR` | chaos | `2` | every bucket with a vaal ceiling | yes |
| `TIER_CUTS` | chaos, per tier | `3000 / 300 / 40 / 5 / 1` | every bucket | yes |
| `alwaysShow` (Foulborn) | on/off | on | the Foulborn buckets | yes |
| `MIN_DAILY_LISTINGS` | listings per day | `20` | every row from `/compact` | **no** |

**`MIN_DAILY_LISTINGS` — the listings floor.** Below it a row is not evidence of a price
and is not read at all. It answers open question 4 of the exploration doc — emit on thin
data, or stay silent — and it is the only lever that overrides the show-cheap baseline,
because a price with no listings behind it is not a cheap item, it is not an item.

It is also the only lever that **cannot move at runtime**: it decides which rows are read,
so changing it means re-running the classifier. A generator lever, not a profile one.

**Rows the Currency Exchange priced are exempt.** The floor disbelieves a scraped listing
nobody acted on; an exchange row is a real book, where low volume means scarce. Median
exchange volume is 3,566 against a floor built for numbers near 20, and the rows it would
cut there are Mirror of Kalandra at 1 and House of Mirrors at 1 — the opposite of what the
floor is for.

On `/compact` it removes three fabricated prices that had each set a tier. What `daily`
actually counts is still open in `TODO.md`: an item nobody lists because it is worthless
and an item nobody lists because almost none exist look identical through it.

**`MAX_GAMBLE_FLOOR` — the loss cap.** The most the player will destroy on a corruption.
Read against `vaalFloor`, the plain price of the member whose corrupted price sets the
ceiling — the item the orb actually destroys, which is often not the item setting the
bucket's plain ceiling. Absolute where the ratio test is relative, and that is the point:
Kalandra's Touch at 525c passes the ratio at 91× and is still a ring almost nobody vaals.
Failing it demotes to `take`, never hides. At 2c it holds 163 buckets vaalable out of 479
that pass the ratio; 5c gives 227, 10c gives 298. **2c excludes Valyrium**, which is 5c
plain in this snapshot.

**`TIER_CUTS` — the value floor, five times over.** The bottom cut is the doc's "minimum
value to show a `take`", and the others are the same lever repeated per treatment. Moving
the whole ladder is a profile change; moving one cut re-sorts buckets between two
treatments. Not yet split into a per-verb floor, which the doc asks for — a player who will
not tab out mid-map wants a different floor for `price` than for `take`.

**`alwaysShow` — the Foulborn toggle.** Hardcoded `true` for the Foulborn pass. It is the
switch that keeps a category on screen at `T5` when it is worth nothing. Currently not
reachable from outside `classify`, and it is the one on this page that most obviously wants
to be a real profile field.

## Constants — modelling choices, not knobs

| Name | Value | Why it is not a lever |
| --- | --- | --- |
| `RATIO_THRESHOLD` | `10` | The player already owns the value thresholds. A second knob here is how this grows into forty checkboxes. |
| `T0_CEILING` | `20_000` | The ceiling-driven exception: a one-in-a-million drop is worth nothing on average and still stops the map. Moving it changes what "stop the map" means, which is a design decision, not a preference. |
| `CHECK_DISCOUNT` | `0.3` | How much of a `check` ceiling to count. A guess at how often the good outcome is the one on the floor. Should become a real number from drop weights, not a knob. |
| ilvl cut, `best / 2` | half the best price | Where a base bucket puts its `ItemLevel >=`. An approximation, in the generous direction. |

## Market facts currently typed in by hand

Neither levers nor constants. These are numbers the data should supply and does not yet.

| Name | Value | Should come from |
| --- | --- | --- |
| `VAAL_HIT_RATE` | `0.05` | The wiki's implicit tables and the logic that picks between them. Every `gamble` tier is scaled by this, so the tiers are currently ordered right and scaled arbitrarily. See `TODO.md`. |
| `VAAL_ORB_COST` | `1` | The market. A Vaal Orb has a price and it moves. |

## Data guards — cleaning, not policy

| Name | Test | Effect |
| --- | --- | --- |
| `isTroll` | `lowConfidence && daily <= 2 && mean > 5000` | Drops the row. Subsumed by `MIN_DAILY_LISTINGS` at any setting above 2, and kept for when the floor is lowered. |
| `isThin` | 84 | `lowConfidence \|\| daily < 10` | Flags the bucket. Never hides it — a thin bucket lands at T4, shown quietly. |
| `restrictedDrop` default (`merge-uniques.ts`) | absent → `false` | An unknown restriction keeps the unique in its base's bucket, where it can only raise the ceiling. The loud direction, on purpose. |

## Levers the design names and the code does not have

From section 5 of `docs/plans/filter-exploration.md`. Each is a number a player owns, so
each spends visual budget, and none exists yet:

- **Minimum expected value to show a `gamble`.** Separate from the loss cap: the cap is
  what you will risk, this is what the risk has to be worth. Needs a real `VAAL_HIT_RATE`
  first or it is a threshold on a made-up number.
- **Liquidity class.** Instant versus has-to-be-traded. The one no current filter can
  express, and it needs listing counts and time-to-sell — observable from collected trade
  data and nowhere else.
- **Bulky sellable bases, on/off.** Slot cost is already computed per bucket (`slots`) and
  nothing reads it. The toggle is used far more than the number beside it.
- **Minimum expected value to show an `id`, and a separate one for `price`.** No buckets
  carry those verbs yet — unidentified rares are not in this dataset.
- **Whether `collect` appears at all.** Recipes are a playstyle, not a valuation. No
  `collect` verb exists.
- **Do I craft?** Turns crafting-base buckets on and off wholesale. No such bucket exists.

## The shape a lever has to keep

The runtime editor must never decide what an item *is*. That is why `tierWithoutVaal` sits
beside `tier` on every bucket: switching gambling off picks the other number that is already
computed, and re-prices nothing. Any lever added later has to precompute both sides the same
way, or it belongs in the generator instead.
