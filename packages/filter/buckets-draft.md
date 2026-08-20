# Bucket draft — rough

Produced by `classify-cli.ts`. Nothing here is hand-written; re-run it after a market
refresh and these numbers move.

```bash
yarn tiers
```

**5,847 buckets** for Allflame, from 33,144 compact rows, 1,988 corrupted items, 1,035
exchange rows and 1,546 uniques. 41 flagged thin. Full list in `buckets-draft.json`,
richest first.

Every input is fetched live. Nothing in this package reads a committed dump — a dump goes
stale silently and produces a classification nobody can reproduce. Each getter caches to
disk with the league and the hour in its key, so a re-run inside the hour costs no
requests.

## The baseline, and the one thing that overrides it

**Better to show a cheap item than to hide an expensive one.** A wrongly shown item costs
a click; a wrongly hidden one costs the item and the player's trust in the filter. So:

- **An unknown restriction never excludes.** No wiki row means `restrictedDrop: false`,
  which keeps the unique in its base's bucket where it can only raise the ceiling.
- **A bucket is tiered on its best outcome**, not its likeliest, and `setBy` records which
  member that was.
- **821 buckets hide**, all on trusted prices under 1c.
- **Foulborn never hides.** `T5` exists for a bucket that must appear and is worth nothing
  — the smallest mark the game can draw. 344 buckets land there.

**The listings floor is the exception, and it is deliberate.** A row with fewer than
`MIN_DAILY_LISTINGS` (20) listings in the last 24 hours is not read at all. A price with
nothing behind it is not a cheap item — it is not an item — and the show-cheap rule cannot
help there. This is open question 4 of the exploration doc, answered: stay silent.

**Rows the exchange priced are exempt.** The floor exists to disbelieve a scraped listing
nobody acted on. An exchange row is a real book with a real counterparty, where low volume
means scarce rather than fabricated — median volume there is 3,566, and the rows a floor of
20 would cut are Mirror of Kalandra at 1, House of Mirrors at 1 and Hinekora's Lock at 3.

It caught three fabricated prices that had each set a tier:

| Bucket | Fake price | Listings | Real price |
| --- | --- | --- | --- |
| Enlighten Support | 57,260c | 4, at level 1 quality 11 | 199c |
| Foulborn Headhunter | 354,978c | 3 | ~163,000c |
| Etched Hatchet | 1,988c | 0 | ~50c |

Those three came from `/compact`. Everything the exchange prices keeps its bucket whatever
its volume, which is how Mirror of Kalandra is T0 at 65,000c rather than absent. What
`daily` actually counts is still a `TODO.md` entry: on the compact feed, scarcity and
worthlessness look identical through it.

## Rules

- **Verb** by the ratio test, `ceiling / floor > 10` → `check`, else `take`. A `take` that
  is `vaalable` becomes `gamble`.
- **Tier** by expected value of the verb's action: `take` → the higher of floor and
  ceiling, `check` → `ceiling × 0.3`, vaal → `vaalCeiling × 0.05 − 1c`.
- `ceiling ≥ 20,000c` forces T0 regardless — the ceiling-driven exception.
- Cuts: T0 ≥ 3,000c · T1 ≥ 300c · T2 ≥ 40c · T3 ≥ 5c · T4 ≥ 1c.

## Grid

| | take | check | gamble |
| --- | --- | --- | --- |
| T0 | 110 | 7 | 0 |
| T1 | 379 | 6 | 0 |
| T2 | 765 | 14 | 0 |
| T3 | 1,391 | 33 | 4 |
| T4 | 1,744 | 5 | 16 |
| T5 | 344 | 0 | 0 |
| varies | 207 | 1 | 0 |
| hidden | 719 | 0 | 102 |

## Families

| Family | Buckets | Key |
| --- | --- | --- |
| gems | 2,121 | gem name × level × quality × corrupted |
| stackables | 1,421 | category/name × stack |
| bases | 791 | base name, carrying an item level |
| div-cards | 451 | card name |
| uniques-by-base | 427 | base type |
| misc | 324 | category/name |
| foulborn | 170 | Foulborn base type |
| replicas | 87 | Replica base type |
| maps | 39 | tier × frame, or blight flag × tier |
| fragments / unique-maps | 15 / 1 | name, or the whole class |

**The `bases` family is back, and it was never the data.** The draft used to say PoeWatch
publishes no bases for this league. It publishes 19,856 of them: `/compact` answers with
13,195 rows and no bases at all unless the request asks for `all=true`, and then it answers
with 33,144. The cluster jewels, abyss jewels, talismans and tinctures arrive in the same
payload, filed under `bases`. 5,267 of those rows clear the listings floor and 1,718 of
those are worth 5c or more — a Simplex Amulet at ilvl 86 is 39,199c on 41 listings.

Influenced base rows are still skipped, and that is a rule rather than the data — see
`baseBuckets`. What a Shaper Hubris Circlet is worth depends on the mod pool it can roll,
and one number per base is not a price of that.

**Blighted and blight-ravaged maps are keyed on their own flag**, one bucket per tier, and
the plain tier blocks carry `BlightedMap False` and `UberBlightedMap False` so the two
cannot be confused by block order. They used to share a bucket with the white map of the
same tier and set its price: a Blighted Map (Tier 1) is 15c against 1c for the plain one,
which paid the blighted price out on every white t1 that dropped.

**Gems keep only the combinations that reach the floor.** Levels {1, 20, 21} crossed with
qualities {0, 20, 23}, corruption in the key. Level 21 appears only corrupted, which is
where it comes from.

## Corruption is a property, not a bucket

A block keyed on one unique can never fire — the filter reads rarity and base type, never
which unique this is. So the vaal side rolls up to the base:

| Field | Means |
| --- | --- |
| `ceiling` | best plain outcome on this base |
| `vaalCeiling` | best corrupted outcome across its droppable members |
| `vaalFloor` | plain price of the member that ceiling belongs to — what the orb destroys |
| `vaalable` | clears both the ratio test and the loss cap |
| `tierWithoutVaal` | what the bucket becomes when the player switches gambling off |
| `setBy` | which member set the tier, and whether it was the corrupted price |

Two tests decide `vaalable`: the **ratio**, `vaalCeiling > vaalFloor × 10`, relative; and
the **loss cap**, `vaalFloor <= 2c`, absolute and a player lever. Both read `vaalFloor`
rather than `ceiling`, because the best plain unique and the best vaal target are often
different items on one base.

**127 buckets are vaalable.** Failing either test demotes to `take` or `check` and keeps
the plain tier — a 525c unique the player will not gamble is still worth picking up.

    T2 →T4  gamble VAAL  vaalFloor= 2c   vaal= 5kc   Soldier Gloves   set by Southbound corrupted 5kc
    T3      check        vaalFloor=39c   vaal=32kc   Moonstone Ring   set by Shavronne's Revelation 66c
    T1      check        vaalFloor= 3kc  vaal=36kc   Leather Belt     set by Headhunter 3kc

## Where the sources go

| Source | Decides |
| --- | --- |
| GGG `/data/items` | which uniques exist, and their base types |
| poewiki cargo | `restrictedDrop` and the item class, and nothing else |
| PoeWatch `/exchange/ratios` | the price of anything traded on the Currency Exchange |
| PoeWatch `/compact?all=true` | every other price, bases included |
| PoeWatch corruption | `vaalCeiling` |

869 of 1,588 uniques are restricted and excluded. That exclusion is what keeps these
honest — a Viridian Jewel is never Impossible Escape, an Amethyst Ring is never Original
Sin.

## Three passes over the uniques, because the game gives two flags

`Foulborn` and `Replica` are conditions a block can carry, so a base's uniques split into
three disjoint sets and each gets a block of its own. Same rules, same ratio test, one
extra condition line — which is also what orders them, since the emitter writes the block
saying more about an item above the one saying less.

**87 replica buckets.** The wiki marks 102 of the 103 replicas as restricted drops, which
is true of where they come from and would delete the family outright if it were read here.
It is ignored on this pass alone: the exclusion exists to stop a block promising a unique
its base cannot roll, and `Replica True` is on the block. What it was costing: Replica
Alberon's Warpath is 5,564c on a Soldier Boots whose plain bucket hides.

Replicas are not always shown — a cheap replica is a cheap item. Foulborn still is.

## Foulborn is its own section

Foulborn items come from somewhere else and get their own 170 buckets, always shown, under
the same rules. The split is not cosmetic — a plain Headhunter is 3,181c on 4,165 daily
listings while the Foulborn ones run to six figures. Foulborn rolls collapse: `(Culling)`
and `(Minimap Icons)` are two Foulborn Headhunters and the filter cannot read the mod that
separates them, so they are one bucket priced at the best of them.

## Known gaps

Written up in `TODO.md`.

- **Gem buckets are 36% of the file.** The combinations are real, but many are the same
  price for one gem and could collapse to a single block.
- **`daily` is listings, not sales**, and the classifier reads it as confidence. Scarcity
  and worthlessness are indistinguishable through it. Vial of the Ghost is 994c on 6
  listings and has no bucket.
- **`id` and `price` have no buckets.** Unidentified rares are in no feed here — the
  roll-ambiguity half of section 6, which needs collected trade listings.
- **Influenced bases are skipped**, so the base family covers the white ones only. One
  number per base is not a price of an item whose worth is the mod pool it can roll.
- **Sockets and links have no family.** Six sockets is seven Jeweller's Orbs and nothing
  in the file models a value that comes from a recipe rather than a listing.
- **`VAAL_HIT_RATE` is a guess** at 0.05, so gamble tiers are ordered correctly and scaled
  arbitrarily. The wiki has the rates and the logic.

## Gold is the one price nobody publishes

Gold cannot be traded, so no feed quotes it and none ever will. It is injected as a
currency row priced off `goldPerDivine`, a lever rather than a rate — a million gold to
the divine by default — and from there it earns its stack ladder from the same arithmetic
as every orb:

| Stack | Worth | Tier |
| --- | --- | --- |
| 3,000 | 0.6c | T4 |
| 25,001 | 5c | T3 |
| 200,001 | 41c | T2 |
| 1,000,000 | 205c | T1 |

**The bottom rung is a deliberate skew and the only one in the file.** 3,000 gold prices
under the T4 cut and every rule here would hide it, correctly, if the question were what
one click of gold is worth. It is not — gold accrues in piles this size and is spent in
five and six figures — so the rung is set by hand and floored at T4. NeverSink draws the
same line at 3,001. Everything above it is the arithmetic, untouched.
