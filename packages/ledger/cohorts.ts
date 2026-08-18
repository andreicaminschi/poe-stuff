import { randomUUID } from "node:crypto";
import { db, transaction } from "./db.ts";
import type { FailureGroup, JobRow } from "./types.ts";

/** Postgres counts as bigint, which comes back as a string. */
const asCount = (value: string | number | null | undefined) => Number(value ?? 0);

/**
 * `2026-08-18T14-03-05Z-a4f2` — the time it was made, then enough randomness that two
 * cohorts started in the same second are still two cohorts. Sorts by time and reads as a
 * date without anyone having to look it up.
 */
export function newCohortId(now: Date = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-");

  return `${stamp}-${randomUUID().slice(0, 4)}`;
}

/** Starts a cohort against the query file it was built from. */
export async function newCohort(queriesDigest: string): Promise<string> {
  const cohortId = newCohortId();

  await db().query(
    "insert into cohort (cohort_id, queries_digest) values ($1, $2)",
    [cohortId, queriesDigest],
  );

  return cohortId;
}

/**
 * How much of the cohort is still running. Worked out from the rows every time rather
 * than tracked in a counter, so it cannot drift away from what is actually there.
 */
export async function outstanding(cohortId: string): Promise<number> {
  const { rows } = await db().query<{ count: string }>(
    `select count(*) from job
      where cohort_id = $1 and state in ('pending', 'active')`,
    [cohortId],
  );

  return asCount(rows[0]?.count);
}

/**
 * Marks a cohort as having nothing left running. Exactly one caller gets `true` — the
 * worker that settled the last job — and that one owns checking the cohort over.
 */
export async function finish(cohortId: string): Promise<boolean> {
  const { rowCount } = await db().query(
    `update cohort set finished_at = now()
      where cohort_id = $1 and finished_at is null`,
    [cohortId],
  );

  return (rowCount ?? 0) > 0;
}

/**
 * Makes a cohort the current one, and only at 100%: every job either done, or
 * deliberately dropped by a replacement. A cohort with failures in it stays finished and
 * unpromoted, and the cohort before it goes on being current.
 */
export async function promote(cohortId: string): Promise<boolean> {
  const { rowCount } = await db().query(
    `update cohort set promoted_at = now()
      where cohort_id = $1
        and finished_at is not null
        and promoted_at is null
        and not exists (
          select 1 from job
           where cohort_id = $1 and state not in ('done', 'deprecated')
        )`,
    [cohortId],
  );

  return (rowCount ?? 0) > 0;
}

/**
 * What broke and how often, grouped the way someone reads it: a handful of timeouts is
 * worth retrying, four hundred of the same 400 is a query to fix.
 */
export async function failures(cohortId: string): Promise<FailureGroup[]> {
  const { rows } = await db().query<Omit<FailureGroup, "count"> & { count: string }>(
    `select query_id, kind, http_status, error, count(*) as count
       from job
      where cohort_id = $1 and state = 'failed'
      group by query_id, kind, http_status, error
      order by count(*) desc`,
    [cohortId],
  );

  return rows.map((row) => ({ ...row, count: asCount(row.count) }));
}

/**
 * Puts every failed job in a cohort back on the pile, and reopens the cohort so it can
 * finish again once they are done. This is the one transition that runs backwards, and
 * only this call makes it.
 *
 * Answers with the rows to queue again.
 */
export async function repair(cohortId: string): Promise<JobRow[]> {
  return transaction(async (client) => {
    await client.query(
      "update cohort set finished_at = null where cohort_id = $1",
      [cohortId],
    );

    const { rows } = await client.query<JobRow>(
      `update job
          set state = 'pending', error = null, http_status = null, updated_at = now()
        where cohort_id = $1 and state = 'failed'
        returning job_key, cohort_id, query_id, parent_key, kind, state, attempts,
                  payload, error, http_status, object_key, item_count, duration_ms,
                  fetched_at, updated_at`,
      [cohortId],
    );

    return rows;
  });
}

/**
 * Drops a query out of a cohort that is already running, because the query itself was
 * the problem and a replacement has taken its place.
 *
 * The cohort is re-stamped with the digest of the edited file and reopened, and every
 * job of that query — searches and their pages — becomes `deprecated`. Deprecated rows
 * do not hold promotion back, so what comes back here matters: the objects those pages
 * wrote have to be deleted, or an ETL will read data the cohort no longer counts.
 */
export async function deprecate(
  cohortId: string,
  queryId: string,
  queriesDigest: string,
): Promise<string[]> {
  return transaction(async (client) => {
    await client.query(
      `update cohort set queries_digest = $2, finished_at = null
        where cohort_id = $1`,
      [cohortId, queriesDigest],
    );

    const { rows } = await client.query<{ object_key: string | null }>(
      `update job set state = 'deprecated', updated_at = now()
        where cohort_id = $1 and query_id = $2 and state <> 'deprecated'
        returning object_key`,
      [cohortId, queryId],
    );

    return rows
      .map((row) => row.object_key)
      .filter((key): key is string => key !== null);
  });
}
