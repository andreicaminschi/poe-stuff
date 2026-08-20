# What the feeds do not price

Item groups the classifier has no number for, given `/compact?all=true` and
`/exchange/ratios`. Biggest first. 160 of NeverSink's 2,491 named base types are absent
from both feeds, down from 582 before `all=true`.

1. **Anything whose value is the roll rather than the base** — rare gear, veiled, fractured, synthesised, lab enchantments, cluster jewel passives, corrupted implicits on rares. Both feeds price a name, and a rare Simplex Amulet is worth its six mods. ~150 NeverSink blocks, sections 0600–2200. Needs collected trade listings, which are selection-biased: only good rolls get listed and anything vendored appears nowhere.
2. **Influenced bases** — the feed carries `influences` on all 19,856 base rows and `baseBuckets` skips them, because one number per base is not a price when the value is which mod pool it can roll. The largest set that is one decision away rather than one source away.
3. **Voidstones** — four base types, zero rows in either feed.
4. **Awakened gems apart from Enlighten, Empower and Enhance** — NeverSink names 36, the feed prices three.
5. **Gold** — untradeable, so no market exists to quote it. Priced off the `goldPerDivine` lever instead.
6. **Everything under the listings floor** — `MIN_DAILY_LISTINGS` is 20 and only exchange rows are exempt. Vial of the Ghost is 994c on 6 listings and has no bucket. Cuts the scarce and the worthless alike, which is the open `daily` question in `TODO.md`.
7. **Odds and ends nobody listed this league** — Dextral and Sinistral Catalyst, Essence of Desolation, Remnant of Corruption, three divination cards, Allflame Ember of K'Tash, The Black Barya, Mercenary Warrant.

## Absent because the league is not running

Not gaps. NeverSink carries these for other leagues and none of them can drop in Allflame.

1. Idols — event leagues only.
2. Tattoos — Ancestor.
3. Legacy currency — Eternal Orb, Silver Coin, Coin of Knowledge, Coin of Power, Coin of Skill, Imprint, Unshaping Orb.
4. Old map items — Ancient, Timeworn and Vaal Reliquary Keys, Inscribed Ultimatum, Valdo Map.

## Closed by `all=true`

`/compact` answers with 13,195 rows and no crafting bases unless the request carries
`all=true`, and then with 33,144. These were on this list until it did.

1. White bases — 791 buckets.
2. Cluster and abyss jewels, talismans, tinctures — filed under `bases`.
3. Heist contracts and blueprints — 23 buckets. Contract: Smuggler's Den runs 13,332 listings a day.
4. Expedition logbooks, itemised corpses — 92 buckets between them.
