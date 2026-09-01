# TODO

Deferred decisions. Nothing here is scheduled.

- **Nothing reads `.s3` back.** The POC dropped pages in raw, one file per page, and no
  second pass over them was ever written. Those pages are live trade listings, which is the
  one price source the aggregators cannot give you — so the pass over them is an **input to
  `apps/catalog`**, not a separate artifact. Undecided whether the catalog reads `.s3`
  itself or something folds pages into a price row first.
- **The collector has no queue and no record of outstanding work.** Both were containers in
  the POC — Redis and Postgres — and neither is configured any more. `apps/collector` cannot
  be written until something replaces them. See
  [apps/collector/README.md](apps/collector/README.md) for what carries over.
- **No canonical item id.** Five sources name the same item five ways, and every join
  downstream crosses them. `apps/catalog` is the join, so this blocks it outright — and
  everything downstream of it.
- **A job that can never succeed blocks its cohort forever.** Promotion needs every job
  done, and there is no way to mark one as acceptably missing. Replacing the query is the
  answer for now (`poe cohort replace`). If a cohort ever gets stuck on something that
  cannot be replaced, this needs a real answer — an allowed-failure budget, or a state
  that means "given up on, on purpose".

- **A page file can hold `null` rows.** GGG returns `null` in `result` for an item
  delisted between the search and the fetch, and `writePage` stringifies it straight
  through — 73 of 768 lines in one 8-query cohort were the literal text `null`. Anything
  reading pages back has to skip them or every count is 10% off. Undecided whether the
  filter belongs at write, which loses the record of how many vanished, or at read.

## Filter

The classifier these entries describe was a POC and is deleted. They are kept because each
one is a decision about the game rather than about the code, and every one of them comes
back the moment `apps/generator` classifies items again. The constants named below no longer
exist anywhere.

- **The Originator implicit cannot be named, so both Originator buckets key on
  `HasImplicitMod True`.** The Originator's Memories is an implicit, and the grammar has
  exactly one general implicit condition — carries at least one, with no way to say which.
  There is no name-matching form; `HasEaterOfWorldsImplicit` and
  `HasSearingExarchImplicit` are the only numeric ones and both are mechanic-specific. So
  the blocks fire on any tier-16 map carrying any implicit: Elder and Shaper influence,
  the occupied-by and Citadel implicits, and anything a corruption added. That is the
  show-cheap trade rather than a bug, but it means `map:t16 originator` is really
  "tier-16 with an implicit" and is tiered as though it were the Originator one. Worth
  revisiting if GGG ever ships a named implicit condition, or if the over-shown set turns
  out to be large in play. NeverSink reaches the same wall and answers it differently —
  it ships `HasImplicitMod True` only as a `Continue` border stripe, never as a tier, so
  the map keeps whatever tier its own properties earned and the implicit just paints the
  border. That is the better shape and this classifier has no way to express it: `Bucket`
  has no concept of a layer that decorates another block.
- **`HasExplicitMod` counts names in `@poe/filter-eval`, and the game counts modifiers.**
  `matchCounted` in `lib/filter-eval/evaluate-filter.ts` counts how many of the
  *listed* names appear as a substring of any of the item's modifiers, so the count can
  never exceed the number of names on the line. The game counts matching *modifiers*, which
  the line does not bound. The eight-modifier trick,
  `HasExplicitMod >=8 "a" "e" "i" "o" "u" "y"`, asks for eight out of six names: routine in
  the game, unsatisfiable under the evaluator. The substring direction is right and defends
  a real case — the NeverSink sample writes `"Elevated "` with a trailing space — and that
  case survives either way, because counting per modifier is still a substring test on each
  one. Only the thing being counted changes. It made `map:t16 corrupted 8 mods` the one
  bucket the verify pass could not probe, so the build reported it as unverifiable rather
  than as a wrong tier and did not fail the run on it.
- **Nothing prices an eight-modifier map, so `map:t16 corrupted 8 mods` is floored at T2
  by hand.** `T16_VARIANTS` in the removed classifier set an absolute tier instead of a
  price, which is the player saying always pick one up rather than a claim about what one
  is worth. No aggregate feed carries the item: PoeWatch has one row for every tier-16
  map, `Map (Tier 16)` at 2c across 1.4M listings, and the Currency Exchange has none. The
  only source that could answer is a live trade search, and the trade API has no
  modifier-count filter either — the nearest handle is a high `map_iiq` threshold in
  `map_filters`, which is a proxy and not the thing. Until that is built, moving the T2 is
  the only lever, and it is a preference rather than a correction.
- **`map:t16 corrupted unidentified` is treated as an eight-modifier map, and that is a
  placeholder.** A corrupted map can land unidentified, `HasExplicitMod` cannot read an
  unidentified item's modifiers, and so the ground offers nothing to tell the two apart.
  It is floored at the same T2 on the show-cheap rule — tier at the best outcome when the
  filter cannot distinguish — which is right in kind and unmeasured in degree. What is
  missing is the share of unidentified corrupted t16 drops that actually carry eight
  modifiers. If that share is small this is loud for no reason, and the bucket should fall
  back to the plain `map:t16` tier instead.
- **`VAAL_HIT_RATE` in the removed classifier was a guess.** 0.05 stood in for the odds a
  corruption lands the outcome worth having, and every `gamble` tier was computed from
  it. The wiki publishes both the implicit tables and the logic that picks between
  them, so this is a real computation waiting to be done: sum over each outcome of
  `P(outcome) × value(item with that implicit)`, less the orb and less the value destroyed
  when the corruption bricks it. Until then the gamble tiers are ordered correctly and
  scaled arbitrarily.
- **Identified and unidentified share a bucket.** `identify` in the removed classifier
  stripped the `Unidentified ` prefix, so both states of one item were priced and tiered
  together. A filter can read the state and could treat them
  separately — deliberately not done. Splitting them doubles the block count for a
  distinction the player has not asked for, so decide it is wanted before doing it.
- **Exceptional gems fall outside the gem grid.** `GEM_LEVELS` in the removed classifier
  kept levels 1, 20 and 21, which is right for every gem that levels to 20 and wrong for
  the three that do not: Enlighten, Empower and Enhance
  cap at 3, or 4 corrupted. Their valuable rows — a level 4 Enlighten trades around
  2,480c on ~900 daily listings — are dropped entirely, leaving only the 199c level 1
  bucket. Needs a per-gem maximum level, and a list of which gems are exceptional; the
  wiki knows both. Until then the filter is blind to the most expensive support gems in
  the game.
- **Gem buckets are 76% of the file.** Splitting on level, quality and corruption took the
  gem family from 1,553 buckets to 8,477, and the whole classification from 4,179 to
  11,103. The combinations are real — a filter reads all three properties — but many of
  them are the same price for one gem, and a pass that collapses combinations sharing a
  treatment would emit one block where there are now several. The block-count question is
  no longer theoretical: decide whether thousands of blocks costs parse time, hits a limit,
  or is merely undebuggable, before the emitter is built around the current shape.
- **`daily` is listings, not sales — and the classifier treats it as confidence.**
  `@poe/poe-watch/types` documents it as "number of listings observed within the last 24
  hours", which is what PoeWatch scraped, not what changed hands. `MIN_DAILY_LISTINGS` in
  the removed classifier read it as evidence that a price is real, and that conflates two
  different things: an item nobody lists because it is worthless, and an
  item nobody lists because almost none exist. Mirror of Kalandra sits at 17 a day and is
  dropped by a floor of 20 for the second reason, not the first. Worth establishing what
  the field actually counts, and whether a scarce item needs a different test — a floor on
  listings crossed with the price, rather than listings alone. Vial of the Ghost is the
  clearest casualty: 994c on 6 listings, on `/compact` rather than the exchange, so nothing
  exempts it and it has no bucket.
- **Sockets, links and the vendor recipes need a family of their own.** Six sockets is
  seven Jeweller's Orbs, six links is twenty Fusings, and a red-green-blue link is a
  Chromatic — value that comes from a recipe rather than from anything a feed lists. Every
  piece is already here: the exchange prices all three currencies, and `Sockets`,
  `LinkedSockets` and `SocketGroup` all parse in `@poe/filter-eval`. What is missing is a
  pass that knows a recipe's payout is a property of the *item* rather than of a market
  row, which no existing family models — every bucket in the file today is priced by
  somebody's listing. NeverSink spends nine blocks on this at section 1400.
- **Whether a gem is worth a block at the state it drops in is unanswered.** The vendor
  rule in `flatBuckets` says nothing at or under level 20, quality 20 earns a block,
  because a gem in that state is a wisdom-scroll purchase. Three rows contradict it —
  Herald of Ice at 10c, Herald of Thunder at 9c and Minion Life Support at 5c, all level 1
  quality 0 and all dropped. Pricing every gem where it lands would catch them, and would
  also catch Elemental Penetration Support at 145c and Block Chance Reduction Support,
  which are vendor-recipe items and do not drop at all. So the rule cannot be written from
  the price feed: it needs a source saying which gems drop. The wiki has it. Three rows at
  under 10c is what it is worth today.





- fractured items??? all bases, only high end bases? lever