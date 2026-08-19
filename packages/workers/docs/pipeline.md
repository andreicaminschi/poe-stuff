# The collection pipeline

A worker is one process that takes jobs off Redis queues and makes requests. Every worker
runs the same code. What changes between them is the order of the queues they read.

Redis holds the work waiting to be done. Postgres is the source of truth for cohorts, for
the record of every job, and for which currency hours have been collected. S3 holds the
pages and the hourly currency digests that come back. The queries themselves are a JSON
file, written by hand.

## The queues

| Queue | One job is | Job data |
| --- | --- | --- |
| `search` | one `POST /search/:league` | `{ cohortId, queryId }` |
| `page` | one `GET /fetch/:hashes`, up to `FETCH_CHUNK` hashes | `{ cohortId, queryId, searchId, hashes, page }` |
| `currency` | the hourly sweep: which currency hours are still owed | `{}` |
| `currency-hour` | one `GET /api/currency-exchange/:hour` | `{ league, hourId }` |

The first two collect a cohort and the last two collect Currency Exchange history — two
pipelines with nothing in common but the worker loop. [Currency Exchange](#currency-exchange)
below is the whole of the second one; everything until then is the cohort.

A search returns up to 100 hashes and the API takes 10 per fetch. The handler for a
`search` job keeps the first `MAX_PAGES` of them, splits those into chunks of
`FETCH_CHUNK`, and puts each chunk on the `page` queue. Every `page` job comes from a
`search` job.

Depth is capped because results come back sorted by price: the cheap end is the market,
and the tail is listings nobody is buying at prices nobody is paying. It is also most of
what a cohort costs — three pages instead of ten is a third of the fetch budget. A query
that needs more depth than the default sets its own `maxPages`.

A job names a query, it does not carry one. The worker reads the league and the body
from the query file when it picks the job up, so the query lives in exactly one place.

The cohort records the digest of the file it was started from, and a worker checks the
file it reads against that digest. An edit part way through a run stops the workers
instead of quietly changing what the cohort is collecting.

Adding a queue means adding a row here, a handler, and a name in a worker's queue list.
The worker code stays as it is — `currency` and `currency-hour` were added that way.

### Job keys

Each job gets a key built from its own data. That key is both its BullMQ job id and its
primary key in the ledger:

```ts
cacheKey("search", cohortId, queryId)
cacheKey("page", cohortId, queryId, page)
cacheKey("currency", league, hourId)
```

`cohortId` is part of the key. The same query run in two cohorts is two separate pieces
of work, and `job_key` is a primary key — without the cohort in it, the second run has
nowhere to write its row.

A page is identified by the query it belongs to and its position, never by the search id
GGG handed back. Two searches of the same query produce the same page keys, which is what
makes the write order below able to reject one of them. The search id and the hashes are
carried in the row as data; they say what to fetch, not which page this is.

Because keys come from the cohort, the query and the page, the same work always produces
the same key. A job that runs twice writes to the same row and the same S3 object, so a
repeat is harmless.

## Queue order and fallback

A worker is started with a list of queues in the order it should read them:

```
search worker:   ["search", "page"]
page worker:     ["page", "search"]
currency worker: ["currency", "currency-hour"]
```

The worker takes a job from the first queue that has one. A search worker works through
every waiting search first; only when the `search` queue is empty does it start taking
`page` jobs. It goes back to searches as soon as one arrives.

The loop:

1. Ask each queue in order for a job without waiting. Take the first job found.
2. If every queue is empty, wait on the first queue for up to `drainDelay` (5 seconds
   by default), then start again at step 1.

Step 2 is why a fallback job can sit for up to `drainDelay` before a worker picks it up:
the worker is parked on its own queue at that moment. Lower `drainDelay` if that matters.

In code this is `worker.getNextJob(token, { block: false })` per queue. The BullMQ
`Worker` objects are created with a `null` processor so that each one only hands out
jobs and the loop above decides which to ask.

Within a queue, BullMQ hands out prioritised jobs first. Repair work is added with a
priority so that it goes ahead of a run that is already in progress.

## One job at a time

Each worker runs one job at a time.

A limiter lets one request through at a time, so a second job running in parallel would
spend its time waiting on one while holding a job lock. More throughput comes from more
processes on more IP addresses.

Running one job at a time is not the same as pacing it. A fetch takes about 300ms, so
back to back that is three a second, against a budget that allows one and a third.

## A limiter per policy

GGG meters each endpoint under its own policy — `trade-search-request-limit` for searches,
`trade-fetch-request-limit` for pages — keyed by IP. Separate budgets, separate tiers, and
a limiter holds one set of rules at a time, so the worker keeps one limiter per queue and
hands each handler the one that matches its job.

The fetch policy, read off a live response:

```
x-rate-limit-ip:       12:4:10,  16:12:300,  50:300:300,  1000:21600:1800
x-rate-limit-ip-state:  1:4:0,    0:12:0,     2:300:0,      39:21600:0
```

`hits : period : restriction`. Three things follow.

**Both ends count, a round trip apart.** A request is recorded here when it leaves and
there when it arrives, so the windows are offset by about 300ms. Every published rule is
paced a slot short and its window held open a second longer than stated. Riding exactly at
the limit is what earns the 300 second restriction on the twelve second tier.

**The state header is the real count.** It includes requests this process never made — a
browser tab, a second worker, anything else on that IP — so every response folds it back
in through `observe`, and whatever it reports beyond what the limiter recorded is charged
to that window until it expires.

**1000 fetches per six hours is what one IP is worth.** A cohort of 2,000 searches
produces around 2,000 page fetches, so a cohort is sized against however many IPs are
running it, not against one worker. Overrunning the tier costs a 30 minute restriction,
and it is the slowest one to recover, so a laptop debugging a run leans on the cache
rather than on the budget.

## Keeping the job lock alive

BullMQ gives a running job a 30 second lock and expects it to be renewed. Jobs regularly
run longer than that: after a 429 the limiter holds every request for 60 seconds or for
whatever `retry-after` says, and `call` applies that hold before the error reaches the
handler. A job waiting two minutes inside `acquire()` is working normally.

So the worker:

- renews the lock with `job.extendLock(token, lockDuration)` every 15 seconds while a
  handler runs, and stops renewing when the job finishes.
- calls `worker.startStalledCheckTimer()` at startup.

Both are automatic in BullMQ's own processing loop and manual in this one. With the lock
renewed, a rate-limited job stays with the worker that owns it and the same request is
made once.

## Retries

`call` is used with `retries: 0` and the queue does the retrying.

The handler catches `GggHttpError` and looks at `retryable`:

- `retryable` is true (408, 429, 5xx) — rethrow. BullMQ retries the job, up to
  `attempts: 5`, with exponential backoff starting at 1 second.
- `retryable` is false (400, 404) — throw `UnrecoverableError`. The same request will
  keep failing, so the job is marked failed and left alone.

The limiter is what keeps retries safe: it has already been given its hold by the time a
429 turns into a thrown error. The backoff on top of that keeps a run of failures from
spinning.

## Retention

```ts
removeOnComplete: true,
removeOnFail: { count: 1000 },
```

Redis only needs a job while it is waiting or running. BullMQ keeps completed jobs by
default so that flows, `waitUntilFinished` and job id dedupe can work; none of those are
used here, and the ledger answers what happened far better than a queue key does.

Failed jobs stay, capped at 1,000, because it is the quickest way to see what is going
wrong while a run is live. Running one again is done from the ledger, not from
`job.retry()`.

## Caching

A request that has been made before can be answered from S3 instead of from GGG. It is
what makes a run debuggable on a laptop: the first run fills the cache, every run after
that costs nothing against the IP budget.

`@poe/ggg` owns the contract and knows nothing about where anything is stored:

```ts
export type CachedResponse = {
  url: string;
  status: number;
  body: unknown;
  storedAt: string;
};

export type ResponseCache = {
  get(key: string): Promise<CachedResponse | undefined>;
  set(key: string, value: CachedResponse): Promise<void>;
};
```

`call` takes one as an option. What it does with it:

1. builds the key from the request — `cacheKey("ggg", method, url, body)`
2. asks the cache. A hit returns the stored body and ends there: no `acquire()`, no
   request, no rate-limit headers to fold back in
3. a miss runs the loop as it always has
4. the first 2xx is written to the cache. Nothing else is — a stored 429 would poison
   every run after it

A hit leaves the limiter alone on purpose. The headers that came with a stored response
describe a budget from whenever it was stored, and replaying a two minute old penalty is
worse than having no information at all.

`call` builds the key itself, so two identical requests cannot be keyed differently by
two callers. Nothing about a cohort or a job goes into it, which is what lets a replay
run as a brand new cohort — new ids, new rows — against the same stored responses.

One event says what happened: `{ type: "cache", result: "hit" | "stored", key }`. A miss
needs no event of its own; the `request` that follows it is the event.

### What `packages/workers` supplies

A folder, one file per request:

```
cache/ggg/<digest>.json      # the CachedResponse
```

Gitignored, and it only ever exists on a laptop, so a folder beats a bucket — it can be
read, grepped and deleted without a client. The `url` lives inside the file because a
digest tells you nothing from a directory listing.

`postSearch` and `fetchPage` take a context — `{ limiter, cache?, onEvent? }` — rather
than growing another positional argument. The worker builds the cache once at startup,
when `CACHE_DIR` is set, and hands the same object to every handler.

There is no switch in the code for turning caching off. Production leaves `CACHE_DIR`
unset and every request goes to GGG; a laptop sets it and the run replays.

### The debug loop

1. Run a cohort with `CACHE_DIR` set. It behaves normally and fills the cache.
2. Run it again. `POST /search` is answered from the cache, so it returns the same search
   id and the same hashes, so every page fetch keys the same way and is answered from the
   cache too.

The whole cohort runs with no requests and no waiting on the limiter.

## Queries

Queries live in a JSON file, because writing them is hand work and a file is the easiest
thing to edit, diff and review.

```json
{
  "id": "veritania-maps",
  "name": "Veritania maps",
  "league": "Standard",
  "active": true,
  "inactiveReason": null,
  "maxPages": 5,
  "body": { "query": { "...": "sent to POST /search/:league" } }
}
```

Queries are not edited in place once they have been run. A query that turns out to be
wrong has `active` set to false with a reason, and a replacement is added under a new id
— `veritania-maps` becomes `veritania-maps-v2`. The old entry stays, so cohorts that used
it still mean something, and the reason is there when someone asks why it stopped being
collected.

A new cohort is built from every entry with `active: true`.

The file is read by the commands and by every worker, all of them pointed at it by
`QUERIES_FILE`. Its digest is recorded on the cohort, so an edit made while a run is
going is caught rather than absorbed — the only edit expected mid-run is a replacement,
and that command updates the digest itself.

## Cohorts

A cohort is one run: 1,500 to 2,000 searches and the pages they produce, around 4,000
jobs in total, sharing a `cohortId`. A cohort that finishes with every job done becomes
the current one. Earlier cohorts stay where they are, so the history is a list of cohorts
rather than something that gets overwritten.

The ledger mints the id. It is the time it was created plus a short suffix —
`2026-08-18T14-03-05Z-a4f2` — so it sorts by time and reads as a date at a glance.

### The ledger

Postgres holds one row per job. This is what says whether a cohort is finished.

The tables, the migrations and the queries against them live in `@poe/ledger`. It exports
`newCohort`, `getCohort`, `outstanding`, `finish`, `promote`, `failures`, `repair` and
`deprecate` for cohorts, `addSearches`, `addPages`, `pagesFor`, `claim` and `settle` for
jobs, and `openHours`, `claimHour`, `settleHour` and `hourCounts` for currency hours — the
worker and every command go through those rather than writing their own SQL, and `pg` is a
dependency of that package alone.

Migrations are plain `.sql` files applied in filename order by a small runner that
records what it has run in a `schema_migrations` table.

```sql
create table cohort (
  cohort_id      text primary key,
  queries_digest text not null,        -- which version of the query file it ran
  created_at     timestamptz not null default now(),
  finished_at    timestamptz,          -- nothing left running
  promoted_at    timestamptz           -- everything done, became the current cohort
);

create table job (
  job_key     text primary key,        -- same key as the BullMQ job id
  cohort_id   text not null references cohort,
  query_id    text not null,           -- id from the query file, for grouping
  parent_key  text references job,     -- the search a page came from, null on searches
  kind        text not null,           -- 'search' | 'page'
  state       text not null,           -- 'pending' | 'active' | 'done' | 'failed' | 'deprecated'
  attempts    int not null default 0,
  payload     jsonb not null,
  error       text,
  http_status int,                     -- the status that failed it, when there was one
  object_key  text,                    -- what a page wrote to S3
  item_count  int,                     -- how many items came back
  duration_ms int,
  fetched_at  timestamptz,
  updated_at  timestamptz not null default now()
);

create index job_outstanding on job (cohort_id)
  where state in ('pending', 'active');
```

A cohort has work left when anything is outstanding:

```sql
select count(*) from job
 where cohort_id = $1 and state in ('pending', 'active');
```

The partial index covers exactly that query, so it stays the size of the work still
running instead of growing with every cohort ever recorded.

This runs after each job settles. Counting rows is not the same as keeping a counter:
the answer is worked out from the rows every time, so it cannot drift away from what is
actually there.

### Write order

The order below is what keeps a cohort honest:

1. mark the search job `active`
2. if page rows already exist for this search, skip to step 5
3. `postSearch`
4. insert every page row in one transaction, `parent_key` set to this search
5. add the page jobs to Redis
6. mark the search job `done`

A page job cannot exist in Redis before its row exists in Postgres. If a worker dies part
way through, rows are left `pending` and the cohort stays open — which is visible, and is
fixed by the search job retrying.

Step 2 is what makes an ordinary retry cheap. A search that already wrote its page rows
does not ask GGG again; it re-adds the jobs it already knows about.

### Two workers, one search

BullMQ delivers a job at least once. If a worker's lock renewal stops for 30 seconds
while its handler is still running — a long pause, a dropped connection — the stalled
check hands the same search to a second worker, and both can be inside `postSearch` at
the same time. `POST /search` is not idempotent: each call returns a fresh search id and
its own hashes.

Step 4 is what settles it. Both workers try to insert the same page keys, because a page
key is made of the cohort, the query and the page number, and neither search id appears
in it. Postgres accepts one transaction and rejects the other on the primary key. The
loser rolls back with no rows written, its job errors, and on the retry step 2 sends it
straight to the pages the winner produced.

The insert is a plain `insert`, with no `on conflict` clause. Skipping conflicts would let
a loser that found one more chunk than the winner slip its extra row in beside the
winner's, which is the outcome the transaction exists to prevent.

The `done` transition stays outside that transaction, in step 6, so that it happens after
the jobs are in Redis. A search that commits its rows and dies before queueing them is
still `active`, so it comes back and finishes the job.

The cost of losing the race is one wasted search call. Nothing reaches S3 twice.

Re-added page jobs whose rows already say `done` are dropped when the worker claims them.
`claim` only hands over a row that is still outstanding.

### The last search

The order above is what makes the end of a cohort safe. Picture the last search still
running while every other job is done: its pages do not exist yet, so a count taken at
that instant could read zero and finish the cohort early.

It cannot, because the search itself is `active` for the whole time, and it only stops
being `active` after its page rows are in Postgres. Between step 4 and step 6 the count
includes those new pending rows. There is no instant where the cohort looks empty while a
search still has pages to make.

### Finishing and promoting

Finishing means nothing is running any more. Promoting means everything that counts is
done. They are separate, because a cohort only becomes the current one at 100%.

The worker that settles the last job sees a count of zero and finishes it:

```sql
update cohort set finished_at = now()
 where cohort_id = $1 and finished_at is null
 returning cohort_id;
```

Exactly one worker gets a row back. That one checks the cohort over — how many jobs are
done, how many failed, and whether the rows holding an `object_key` match what is
actually under the cohort's prefix in S3. Everyone else gets nothing and carries on.

Promotion is a second statement, and it only succeeds when nothing is left unfinished:

```sql
update cohort set promoted_at = now()
 where cohort_id = $1 and finished_at is not null and promoted_at is null
   and not exists (
     select 1 from job
      where cohort_id = $1 and state not in ('done', 'deprecated')
   )
 returning cohort_id;
```

The pointer at `latest.json` moves only when that returns a row. A cohort that finishes
with failures stays unpromoted: its pages are in S3 and its rows say what happened, but
nothing downstream reads it as current. The previous cohort stays current until a
complete one replaces it.

Partial data is never the current cohort. Stale data can be, and that is the trade the
rule makes.

## Recovery

Retrying is something someone decides to do, not something that happens on its own.

### Seeing what failed

```
poe cohort failures <cohortId>
```

Reads the `job` rows in `failed` state and groups them by query and by what went wrong —
the `http_status`, the error text, how many, which queries they belong to. That report is
the thing to read before spending the rate budget again.

### Retrying

```
poe cohort retry <cohortId>
```

Moves the failed rows back to `pending` and adds their jobs to Redis with a priority, so
workers take them before whatever else is queued. A repaired cohort should not wait
behind a run that started later.

```sql
update job set state = 'pending', error = null, http_status = null, updated_at = now()
 where cohort_id = $1 and state = 'failed'
 returning job_key, kind, payload;
```

This is the one transition that goes backwards, and only this command does it.

Both kinds recover on their own terms:

- **A failed search wrote no pages**, because pages are only written once the search has
  come back. Re-running it does a fresh search and adds whatever pages it produces.
- **A failed page can be fetched again as it stands.** GGG keeps a search id alive long
  after the search, so the id and hashes in the payload stay good.

Retrying into a finished cohort reopens it — `finished_at` goes back to null, and the
cohort finishes again when the repaired jobs are done. If nothing is left unfinished at
that point, it promotes and becomes the current one.

### Replacing a broken query mid-cohort

When a query itself is the problem — every search for `veritania-maps` fails because the
filter is malformed — retrying it changes nothing. The query has to be replaced, and the
cohort has to forget what the old one produced.

In the query file, set `veritania-maps` to `"active": false` with a reason and add
`veritania-maps-v2` next to it. Then, for the cohort already running:

```
poe cohort replace <cohortId> veritania-maps veritania-maps-v2
```

That command:

1. records the query file's new digest on the cohort
2. marks every job in that cohort for the old query `deprecated`, pages included
3. deletes the S3 objects those rows name in `object_key`, so no ETL ever sees them
4. adds a `search` job for the new query into the same cohort, at priority
5. reopens the cohort if it had already finished

The new search fans out its own page jobs the usual way. `deprecated` rows do not block
promotion — they are work the cohort deliberately no longer counts, and their data is
gone from S3, so a promoted cohort still means every object in it is wanted.

## Currency Exchange

`GET <POE_CURRENCY_API_URL>/<hourId>` returns one hour of aggregate Currency Exchange
history: every market that saw activity, in every league, as one payload of a couple of
thousand records. `hourId` is a unix timestamp truncated to the hour, which is also how
the endpoint numbers its digests.

This is the CDN, not the trade API. No OAuth, no rate-limit headers, and no share of the
per-IP budget the search and fetch policies meter. The limiter on these queues is
politeness rather than a rule learned from a response — one request a second, which is
what a backfill of several thousand hours should look like from the outside.

Three properties of the source decide everything below:

- **The current hour is never served.** The newest hour worth asking for is
  `CURRENCY_LAG_HOURS` — two — behind the clock.
- **GGG prunes old history.** An hour that was not collected before it fell out of their
  window is gone, and there is no way to ask how far back the window goes. What this
  collects is the only copy.
- **Every league arrives in the same payload.** There is no server-side filter, so
  `POE_CURRENCY_LEAGUE` is applied on the way to S3 and the other leagues are dropped.

An hour belongs to no cohort. It is not part of a run, nothing waits on it, and no
promotion depends on it — which is why it has its own table rather than a third `kind` in
`job`.

### The sweep

A `currency` job works out what is missing and queues one `currency-hour` job per hour:

1. insert a `pending` row for every hour from `POE_CURRENCY_FROM` to the newest servable
   hour, in one transaction
2. read back every row in that range still `pending` or `active`
3. add a job per hour, keyed `cacheKey("currency", league, hourId)`, in chunks of 500

Rows before jobs, the same as a cohort. Step 2 reads rather than trusting what step 1
inserted, so a sweep that wrote rows and died before queueing them is repaired by the next
one; re-queueing an hour that is already waiting costs nothing, because the job id is the
hour and Redis keeps one.

Backfilling is therefore not a separate mode. Every sweep asks for the whole range and the
ledger subtracts what is already collected, so the first sweep after `POE_CURRENCY_FROM` is
moved back queues the history, and every sweep after it queues one hour.

The sweep is the repair pass too. A `failed` row is taken again — unless the endpoint
answered 4xx, which is the one case that is not worth repeating: a 404 is an hour GGG has
pruned or never had, and retrying it every hour forever is the shape this must not take.
408 and 429 are back-pressure rather than an answer, so those stay eligible.

### The hourly tick

The sweep runs on a BullMQ job scheduler, registered once:

```
poe currency schedule       # upserts the "0 * * * *" scheduler
poe currency unschedule
```

The schedule lives in Redis, so nothing has to be up at the top of the hour and there is
no cron anywhere. The due job is promoted out of the delayed set by whichever worker asks
its queue for work next, and a worker started after a gap runs the tick it missed. Because
the sweep asks for the whole range every time, a missed tick costs nothing at all.

### The ledger table

```sql
create table currency_hour (
  hour_id      bigint not null,         -- unix hour, as the endpoint numbers it
  league       text not null,           -- responses carry every league; a row counts one
  state        text not null,           -- 'pending' | 'active' | 'done' | 'failed'
  attempts     int not null default 0,
  object_key   text,                    -- null where nothing was written
  market_count int,                     -- markets kept for this league. 0 is a real answer
  duration_ms  int,
  error        text,
  http_status  int,                     -- what makes a failure worth retrying, or not
  fetched_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (league, hour_id)
);
```

No `deprecated` state: there is no cohort to drop an hour out of. The primary key is what
makes two sweeps running at once harmless — both insert the same hours and Postgres keeps
one row.

### One hour

A `currency-hour` job claims its row, fetches, keeps the configured league, writes NDJSON,
and settles:

```
currency/league=<league>/hour=<hourId>.ndjson
```

Markets are written exactly as they arrived — one record per line, nothing derived. VWAP,
the ratio band and anything chaos-normalised are a later pass over these objects, the same
way pages are a raw drop.

An hour with no markets for this league still settles `done`, with `market_count` 0 and no
`object_key`. The league had no activity that hour, or had not started yet; that is an
answer, not a failure, and it leaves no empty object for a reader to open.

Retries, the job lock and the cache work exactly as they do for a page — same loop, same
`GggHttpError` rules. The cache is worth more here than anywhere: one hour is around a
megabyte for one league, and a replayed backfill costs nothing.

The flow, end to end: [currency.mmd](currency.mmd). The cohort side is
[pipeline.mmd](pipeline.mmd).

### Watching it

```
poe currency status         # the range configured, and how many hours are in each state
poe currency sweep          # one sweep now, without waiting for the hour
```

## Storage

Pages and currency hours go to S3. Search results are not stored — a search exists to
produce page jobs, and the ledger already records that it ran.

```
s3://poe-pages/pages/cohort=<cohortId>/<queryId>-<page>.ndjson
s3://poe-pages/currency/league=<league>/hour=<hourId>.ndjson
s3://poe-pages/latest.json                  # { cohortId }
```

Two things that layout is doing:

1. `cohort=<id>` and `league=<name>` are the naming Hive and Trino use for partitions, so
   a query for one cohort, or for one league, reads only that prefix. A league is a display
   name, so it is percent-encoded — `Hardcore Allflame` is not a partition value.
2. Everything is NDJSON, one record per line. Trino reads line-delimited JSON; the records
   themselves are stored exactly as they arrived.

Everything about a page other than its items lives in its ledger row: `queryId` and
`page` in the key, `searchId` and the hashes in `payload`, and `object_key`, `item_count`, `duration_ms`,
`fetched_at`, `attempts` alongside. One row per object, and `object_key` is what joins
the two. A currency hour works the same way against `currency_hour`, with `market_count`
in place of `item_count`.

`latest.json` stays in S3 because it is what a reader with no database needs in order to
find the current cohort. Anything more than that is a question for the ledger, and Trino
can reach Postgres directly when a query needs both.

The S3 client and the key layout live in `packages/workers`, next to the handlers that use
them. Consolidating pages into something an ETL reads is a later pass over these
objects, and the package that does it is not designed yet — see
[TODO.md](../../../TODO.md).

## Starting a cohort

```
poe cohort start
```

The command:

1. asks the ledger for a new `cohortId` and inserts the `cohort` row, recording the
   digest of the file `QUERIES_FILE` names
2. inserts a `pending` `job` row for every entry marked `active`
3. adds the search jobs to Redis with `queue.addBulk`, in chunks of about 500

Rows before jobs, same as the search handler. Chunked adds because 2,000 single adds is
2,000 round trips.

Running it again against an unfinished cohort is a repair run: rows that already say
`done` are skipped. The ledger is what decides that — a completed job is no longer in
Redis to be recognised by its key.

## Configuration

Everything comes from the environment, read through `@util/core/env`, with a `.env` per
package loaded by `node --env-file=`.

| Variable | Holds |
| --- | --- |
| `POE_USER_AGENT` | sent on every GGG request |
| `POE_TRADE_API_URL` | base of the trade API |
| `QUERIES_FILE` | the JSON file the queries are written in |
| `LOG_FORMAT` | `pretty` or `json`. Unset means pretty on a terminal, JSON everywhere else |
| `LOG_DIR` | folder for a JSON copy of every run. Unset means console only |
| `REDIS_URL` | the queue |
| `DATABASE_URL` | the ledger |
| `S3_URL` | the S3 endpoint. MinIO locally, AWS in production |
| `S3_BUCKET` | where pages and currency hours are written |
| `POE_CURRENCY_API_URL` | base of the Currency Exchange endpoint on the CDN, realm included |
| `POE_CURRENCY_LEAGUE` | the one league kept out of each hourly digest |
| `POE_CURRENCY_FROM` | oldest hour to collect, a unix timestamp or a date |
| `CACHE_DIR` | folder for cached responses. Unset means no caching |

Credentials and region come from the AWS SDK's own environment.
