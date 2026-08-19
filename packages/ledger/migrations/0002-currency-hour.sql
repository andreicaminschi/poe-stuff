-- One row per hour of Currency Exchange history collected, per league. Separate from
-- `job` on purpose: an hour belongs to no cohort, it is never repeated once it is
-- collected, and cohort completion must not wait on it.
--
-- The table is the record of which hours exist locally. GGG prunes old history, so an
-- hour that is not here and has fallen out of their window is gone for good.

create table currency_hour (
  -- Unix timestamp truncated to the hour, as the endpoint numbers it.
  hour_id      bigint not null,
  -- Responses carry every league; a row counts only what was kept for this one.
  league       text not null,
  state        text not null check (state in ('pending', 'active', 'done', 'failed')),
  attempts     int not null default 0,
  object_key   text,
  -- Markets kept for this league. Null until the hour is done, 0 where the league had
  -- no activity that hour and nothing was written.
  market_count int,
  duration_ms  int,
  error        text,
  http_status  int,
  fetched_at   timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (league, hour_id)
);

-- The sweep asks for the hours it still owes, which is every hour in a range minus the
-- ones already claimed or collected.
create index currency_hour_open on currency_hour (league, hour_id)
  where state in ('pending', 'active');
