/** What a job is: one search, or one page of that search's results. */
export type JobKind = "search" | "page";

/**
 * `pending` and `active` are outstanding work. `done` and `failed` are settled. A
 * `deprecated` row is work the cohort deliberately no longer counts, because the query
 * behind it was replaced part way through.
 */
export type JobState = "pending" | "active" | "done" | "failed" | "deprecated";

/**
 * A row as the table spells it. Nothing is renamed on the way out: what a query returns
 * and what the migration declares stay readable against each other.
 */
export type JobRow = {
  job_key: string;
  cohort_id: string;
  query_id: string;
  parent_key: string | null;
  kind: JobKind;
  state: JobState;
  attempts: number;
  payload: Record<string, unknown>;
  error: string | null;
  http_status: number | null;
  object_key: string | null;
  item_count: number | null;
  duration_ms: number | null;
  fetched_at: Date | null;
  updated_at: Date;
};

export type CohortRow = {
  cohort_id: string;
  queries_digest: string;
  created_at: Date;
  finished_at: Date | null;
  promoted_at: Date | null;
};

/** A job to be written before it is queued. `job_key` is built by the caller from content. */
export type NewJob = {
  job_key: string;
  query_id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
};

/** How a job ended. A page carries what it wrote; a failure carries why. */
export type Outcome =
  | {
      state: "done";
      object_key?: string;
      item_count?: number;
      duration_ms?: number;
      fetched_at?: Date;
    }
  | { state: "failed"; error: string; http_status?: number };

/** One line of the failure report: how many jobs broke the same way. */
export type FailureGroup = {
  query_id: string;
  kind: JobKind;
  http_status: number | null;
  error: string | null;
  count: number;
};
