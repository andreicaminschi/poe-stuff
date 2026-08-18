import { db, transaction } from "./db.ts";
import type { JobRow, NewJob, Outcome } from "./types.ts";

const COLUMNS = `job_key, cohort_id, query_id, parent_key, kind, state, attempts,
  payload, error, http_status, object_key, item_count, duration_ms, fetched_at,
  updated_at`;

/**
 * The search rows a cohort starts with. Repeating a start against the same cohort is a
 * repair run, so a row that already exists is left exactly as it is — including its
 * state, which may well be `done`.
 */
export async function addSearches(
  cohortId: string,
  searches: readonly NewJob[],
): Promise<number> {
  if (searches.length === 0) return 0;

  const { rowCount } = await db().query(
    `insert into job (job_key, cohort_id, query_id, kind, state, payload)
     select * from unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::jsonb[]
     )
     on conflict (job_key) do nothing`,
    [
      searches.map((job) => job.job_key),
      searches.map(() => cohortId),
      searches.map((job) => job.query_id),
      searches.map((job) => job.kind),
      searches.map(() => "pending"),
      searches.map((job) => JSON.stringify(job.payload)),
    ],
  );

  return rowCount ?? 0;
}

/**
 * The page rows one search produced, written as one transaction with no `on conflict`
 * clause.
 *
 * That is what settles two workers running the same search at once. A page key is made
 * of the cohort, the query and the page number, so both workers try to write the same
 * keys; Postgres takes one and rejects the other on the primary key, and the loser rolls
 * back with nothing written. Skipping conflicts instead would let a loser that found one
 * more chunk than the winner slip its extra row in beside the winner's.
 */
export async function addPages(
  cohortId: string,
  parentKey: string,
  pages: readonly NewJob[],
): Promise<number> {
  if (pages.length === 0) return 0;

  return transaction(async (client) => {
    const { rowCount } = await client.query(
      `insert into job (job_key, cohort_id, query_id, parent_key, kind, state, payload)
       select * from unnest(
         $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
         $7::jsonb[]
       )`,
      [
        pages.map((job) => job.job_key),
        pages.map(() => cohortId),
        pages.map((job) => job.query_id),
        pages.map(() => parentKey),
        pages.map((job) => job.kind),
        pages.map(() => "pending"),
        pages.map((job) => JSON.stringify(job.payload)),
      ],
    );

    return rowCount ?? 0;
  });
}

/**
 * The pages a search has already written. A search that retries asks this first: if its
 * rows are there it does not ask GGG again, it re-adds the jobs it already knows about.
 */
export async function pagesFor(parentKey: string): Promise<JobRow[]> {
  const { rows } = await db().query<JobRow>(
    `select ${COLUMNS} from job where parent_key = $1 order by job_key`,
    [parentKey],
  );

  return rows;
}

/**
 * Takes ownership of a job, or hands back nothing.
 *
 * Nothing comes back when the row has already settled, which is how a job re-added to
 * Redis after its work was finished gets dropped instead of repeating it. A row that is
 * already `active` can still be claimed: that is a stalled job coming back, and the new
 * worker is the one that now owns it.
 */
export async function claim(jobKey: string): Promise<JobRow | undefined> {
  const { rows } = await db().query<JobRow>(
    `update job
        set state = 'active', attempts = attempts + 1, updated_at = now()
      where job_key = $1 and state in ('pending', 'active')
      returning ${COLUMNS}`,
    [jobKey],
  );

  return rows[0];
}

/**
 * Writes how a job ended. Settled and deprecated rows are left alone, so a late worker
 * whose lock was taken away cannot overwrite the answer that was already recorded.
 *
 * Answers whether this call is the one that settled it.
 */
export async function settle(
  jobKey: string,
  outcome: Outcome,
): Promise<boolean> {
  const done = outcome.state === "done";

  const { rowCount } = await db().query(
    `update job
        set state       = $2,
            error       = $3,
            http_status = $4,
            object_key  = coalesce($5, object_key),
            item_count  = coalesce($6, item_count),
            duration_ms = coalesce($7, duration_ms),
            fetched_at  = coalesce($8, fetched_at),
            updated_at  = now()
      where job_key = $1
        and state not in ('done', 'failed', 'deprecated')`,
    [
      jobKey,
      outcome.state,
      done ? null : outcome.error,
      done ? null : (outcome.http_status ?? null),
      done ? (outcome.object_key ?? null) : null,
      done ? (outcome.item_count ?? null) : null,
      done ? (outcome.duration_ms ?? null) : null,
      done ? (outcome.fetched_at ?? null) : null,
    ],
  );

  return (rowCount ?? 0) > 0;
}
