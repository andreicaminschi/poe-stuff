# DEPRECATED — `@poe/workers`

**This package is a POC. It will be removed. Do not add to it, and do not import it.**

Replaced by [`apps/collector`](../../apps/collector), which is not written yet.

## It does not compile, on purpose

Two of its dependencies were deleted in the restructure:

- `@poe/ledger` — the job record on Postgres. `handlers.ts`, `queries.ts` and
  `cohort-cli.ts` all import it.
- `@poe/poe-wiki` — the Cargo queries. `influence-queries.ts` imports it, and also imports
  `@util/core/stat-index`, which is now a private file of `lib/item-parser`.

It is excluded from `tsconfig.json` and `jest.config.js` so that `yarn typecheck` stays a
signal rather than permanently red. Nothing here is expected to run.

`compose.yaml` is gone too, so the Redis it queues onto and the Postgres it recorded to are
no longer configured.

## Why it is still here

[`docs/pipeline.md`](docs/pipeline.md) is the design of the collection pipeline in full, and
most of it survives the change of backing store. It is the reason this folder has not simply
been deleted — `apps/collector` gets written against it.

What is worth carrying over is listed in
[`apps/collector/README.md`](../../apps/collector/README.md). The parts that do **not**
carry over are the specific stores: Redis for the queue, Postgres for the record, and S3 for
the objects. S3 is now the local disk at `.s3`, and the other two have no replacement chosen
yet.

## What was here

| File | Was |
| --- | --- |
| `worker.ts` | the loop: several queues, its own first, one job at a time |
| `handlers.ts` | search, page, currency sweep, currency hour |
| `queries.ts` | reads the hand-written query file and its digest |
| `keys.ts` | job keys and object keys, both built from content |
| `pages.ts` | the writes, to S3 |
| `log.ts` | the run log, pretty on a terminal and JSON elsewhere |
| `*-cli.ts` | `cohort`, `worker`, `currency`, `influence-queries` |
