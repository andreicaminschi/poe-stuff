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
