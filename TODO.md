# TODO

Deferred decisions. Nothing here is scheduled.

- **The data lake is not designed yet.** Pages are dropped into S3 raw, one object per
  page, by `packages/workers`. What reads them afterwards — consolidating pages, folding a
  cohort into something an ETL wants — has not been thought about, and a cache does not
  belong in it. Design that before moving any of the S3 code out of `workers`.
- **A job that can never succeed blocks its cohort forever.** Promotion needs every job
  done, and there is no way to mark one as acceptably missing. Replacing the query is the
  answer for now (`poe cohort replace`). If a cohort ever gets stuck on something that
  cannot be replaced, this needs a real answer — an allowed-failure budget, or a state
  that means "given up on, on purpose".

- **A page object can hold `null` rows.** GGG returns `null` in `result` for an item
  delisted between the search and the fetch, and `writePage` stringifies it straight
  through — 73 of 768 lines in one 8-query cohort were the literal text `null`. Anything
  reading pages back has to skip them or every count is 10% off. Undecided whether the
  filter belongs at write, which loses the record of how many vanished, or at read.

## Filter

- **`VAAL_HIT_RATE` in `packages/filter/classify.ts` is a guess.** 0.05 stands in for the
  odds a corruption lands the outcome worth having, and every `gamble` tier is computed
  from it. The wiki publishes both the implicit tables and the logic that picks between
  them, so this is a real computation waiting to be done: sum over each outcome of
  `P(outcome) × value(item with that implicit)`, less the orb and less the value destroyed
  when the corruption bricks it. Until then the gamble tiers are ordered correctly and
  scaled arbitrarily.
- **Identified and unidentified share a bucket.** `identify` in
  `packages/filter/classify.ts` strips the `Unidentified ` prefix, so both states of one
  item are priced and tiered together. A filter can read the state and could treat them
  separately — deliberately not done. Splitting them doubles the block count for a
  distinction the player has not asked for, so decide it is wanted before doing it.
- **Exceptional gems fall outside the gem grid.** `GEM_LEVELS` in
  `packages/filter/classify.ts` keeps levels 1, 20 and 21, which is right for every gem
  that levels to 20 and wrong for the three that do not: Enlighten, Empower and Enhance
  cap at 3, or 4 corrupted. Their valuable rows — a level 4 Enlighten trades around
  2,480c on ~900 daily listings — are dropped entirely, leaving only the 199c level 1
  bucket. Needs a per-gem maximum level, and a list of which gems are exceptional; the
  wiki knows both. Until then the filter is blind to the most expensive support gems in
  the game.
- **Gem buckets are 76% of the file.** Splitting on level, quality and corruption took the
  gem family from 1,553 buckets to 8,477, and the whole classification from 4,179 to
  11,103. The combinations are real — a filter reads all three properties — but many of
  them are the same price for one gem, and a pass that collapses combinations sharing a
  treatment would emit one block where there are now several. This is the block-count
  question from section 3 item 4 of `docs/plans/filter-exploration.md`, no longer
  theoretical: decide whether thousands of blocks costs parse time, hits a limit, or is
  merely undebuggable, before the emitter is built around the current shape.
- **`daily` is listings, not sales — and the classifier treats it as confidence.**
  `@poe/poe-watch/types` documents it as "number of listings observed within the last 24
  hours", which is what PoeWatch scraped, not what changed hands. `MIN_DAILY_LISTINGS` in
  `packages/filter/classify.ts` reads it as evidence that a price is real, and that
  conflates two different things: an item nobody lists because it is worthless, and an
  item nobody lists because almost none exist. Mirror of Kalandra sits at 17 a day and is
  dropped by a floor of 20 for the second reason, not the first. Worth establishing what
  the field actually counts, and whether a scarce item needs a different test — a floor on
  listings crossed with the price, rather than listings alone.
