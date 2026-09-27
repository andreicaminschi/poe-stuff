# collector

**Not written yet.** This folder holds the intent, not the code.

Replaces the deleted `@poe/workers` proof of concept. What that POC got right is written
down below; its code and design notes are gone from the tree and live only in git history.

## What it will own

Everything that turns GGG's trade API into files on disk:

- the worker loop and the job handlers
- the record of what has been collected and what is still outstanding
- the writes into `.s3`
- the hand-authored trade searches it collects, as a file of its own
- its own `.env`

It talks to GGG through `@poe/ggg` and owns no URLs of its own.

## What has to be decided first

The POC used Redis for the queue and Postgres for the record of every job. Neither is configured any more, and no third-party service is going to be until AWS is
real. So the first question this app has to answer is **what replaces them locally** — the
queue and the outstanding-work record are the two things it cannot work without, and both
were containers.

What the POC got right and is worth keeping:

- **Rows before jobs.** The record of a job exists before the job is queued, so a process
  that dies mid-sequence leaves work that is visibly outstanding rather than a run that
  looks complete.
- **Keys built from content.** A job's key comes from the cohort, the query and the page,
  never from an id the server handed back — so the same work always produces the same key
  and a repeat is harmless.
- **The sweep subtracts.** Backfilling is not a separate mode: a sweep asks for the whole
  range every time and the record subtracts what it already has.
- **One limiter is one IP.** One GGG service per process, because the rate budget is per
  address and two limiters in one process spend it twice as fast.

The POC's design in full was `packages/workers/docs/pipeline.md`, deleted with the rest of
that package. Read it out of git history before writing any of this — most of it survives
the change of backing store.
