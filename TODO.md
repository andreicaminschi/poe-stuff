# TODO

Deferred decisions. Nothing here is scheduled.

- **Rename `packages/trade` to `packages/workers`.** It is the home for the CLI workers,
  not just the two trade endpoint wrappers. Not now — after the worker itself exists.
- **The data lake is not designed yet.** Pages are dropped into S3 raw, one object per
  page, by `packages/trade`. What reads them afterwards — consolidating pages, folding a
  cohort into something an ETL wants — has not been thought about, and a cache does not
  belong in it. Design that before moving any of the S3 code out of `trade`.
- **A job that can never succeed blocks its cohort forever.** Promotion needs every job
  done, and there is no way to mark one as acceptably missing. Replacing the query is the
  answer for now (`poe cohort replace`). If a cohort ever gets stuck on something that
  cannot be replaced, this needs a real answer — an allowed-failure budget, or a state
  that means "given up on, on purpose".
