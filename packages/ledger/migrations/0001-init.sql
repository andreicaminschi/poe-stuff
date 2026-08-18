-- One row per cohort, one row per job. Between them they answer whether a run is
-- finished, whether it may become the current one, and what went wrong where it did not.

create table cohort (
  cohort_id      text primary key,
  -- Which version of the query file produced this run. A worker checks the file it
  -- reads against this, so an edit part way through a run is caught rather than absorbed.
  queries_digest text not null,
  created_at     timestamptz not null default now(),
  finished_at    timestamptz,
  promoted_at    timestamptz
);

create table job (
  job_key     text primary key,
  cohort_id   text not null references cohort,
  query_id    text not null,
  -- The search a page came from. Null on searches.
  parent_key  text references job,
  kind        text not null check (kind in ('search', 'page')),
  state       text not null
    check (state in ('pending', 'active', 'done', 'failed', 'deprecated')),
  attempts    int not null default 0,
  payload     jsonb not null,
  error       text,
  http_status int,
  object_key  text,
  item_count  int,
  duration_ms int,
  fetched_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- Covers the one question asked after every settled job. Partial, so it stays the size
-- of the work still running rather than growing with every cohort ever recorded.
create index job_outstanding on job (cohort_id)
  where state in ('pending', 'active');
