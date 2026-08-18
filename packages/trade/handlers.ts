import { UnrecoverableError } from "bullmq";
import type { Job, Queue } from "bullmq";
import { GggHttpError } from "@poe/ggg/errors";
import { finish, getCohort, outstanding, promote } from "@poe/ledger/cohorts";
import { addPages, claim, pagesFor, settle } from "@poe/ledger/jobs";
import type { NewJob } from "@poe/ledger/types";
import { FETCH_CHUNK } from "./config.ts";
import { fetchPage } from "./fetch-page.ts";
import { pageKey } from "./keys.ts";
import { writeLatest, writePage } from "./pages.ts";
import { postSearch } from "./post-search.ts";
import { findQuery, loadQueries } from "./queries.ts";
import { JOB_OPTIONS, PAGE_QUEUE, SEARCH_QUEUE } from "./queues.ts";
import type { TradeContext } from "./types.ts";
import type { JobHandler } from "./worker.ts";

export type SearchJobData = { cohortId: string; queryId: string };

export type PageJobData = {
  cohortId: string;
  queryId: string;
  searchId: string;
  hashes: string[];
  page: number;
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * The page jobs one search produced. Ten hashes to a page, and a key made of the cohort,
 * the query and the position — so a second search of the same query lands on the same
 * keys and Postgres can reject it.
 */
function pageJobs(
  cohortId: string,
  queryId: string,
  searchId: string,
  hashes: readonly string[],
): NewJob[] {
  const jobs: NewJob[] = [];

  for (let page = 0; page * FETCH_CHUNK < hashes.length; page++) {
    jobs.push({
      job_key: pageKey(cohortId, queryId, page),
      query_id: queryId,
      kind: "page",
      payload: {
        cohortId,
        queryId,
        searchId,
        page,
        hashes: hashes.slice(page * FETCH_CHUNK, (page + 1) * FETCH_CHUNK),
      },
    });
  }

  return jobs;
}

/**
 * Run after every settled job. Finishing and promoting are separate: a cohort finishes
 * when nothing is left running, and becomes the current one only when every job is done
 * or deliberately dropped.
 *
 * `finish` answers true for exactly one caller, so only one worker moves the pointer.
 */
async function closeOut(cohortId: string): Promise<void> {
  if ((await outstanding(cohortId)) > 0) return;
  if (!(await finish(cohortId))) return;
  if (await promote(cohortId)) await writeLatest(cohortId);
}

/**
 * Turns a thrown error into either another attempt or a failed row.
 *
 * A retryable status with attempts left goes back to BullMQ untouched, and the ledger row
 * stays `active` because the work is still going. Anything else is the end of the road:
 * the row records what happened before the job is failed for good, or a cohort would wait
 * on a job that is never coming back.
 */
async function fail(
  job: Job,
  jobKey: string,
  cohortId: string,
  error: unknown,
): Promise<never> {
  const http = error instanceof GggHttpError ? error : undefined;
  const lastAttempt = job.attemptsStarted >= (job.opts.attempts ?? 1);

  if (http?.retryable === true && !lastAttempt) throw error;

  await settle(jobKey, {
    state: "failed",
    error: message(error),
    http_status: http?.status,
  });
  await closeOut(cohortId);

  throw new UnrecoverableError(message(error));
}

/**
 * One search: ask GGG, write the page rows, queue them, then mark itself done.
 *
 * The order is the point. Page rows exist before their jobs do, and the search stays
 * `active` until after the jobs are queued — so a worker that dies in the middle leaves
 * work that is visibly outstanding rather than a cohort that looks complete.
 */
async function handleSearch(
  job: Job,
  context: TradeContext,
  pageQueue: Queue,
): Promise<void> {
  const jobKey = String(job.id);
  const { cohortId, queryId } = job.data as SearchJobData;

  // Nothing back means the row has already settled: this is a job that was queued again
  // after its work was finished, and there is nothing left to do.
  if ((await claim(jobKey)) === undefined) return;

  try {
    // A search that already wrote its pages does not ask GGG again. Without this, a
    // retry would run a second search and write a second set of pages of the same items.
    if ((await pagesFor(jobKey)).length === 0) {
      const file = await loadQueries();
      const cohort = await getCohort(cohortId);

      if (cohort?.queries_digest !== file.digest) {
        throw new Error(`the query file changed under cohort ${cohortId}`);
      }

      const query = findQuery(file, queryId);
      const answer = await postSearch(query.body, query.league, context);

      await addPages(
        cohortId,
        jobKey,
        pageJobs(cohortId, queryId, answer.id, answer.result),
      );
    }

    const waiting = (await pagesFor(jobKey)).filter(
      (page) => page.state === "pending",
    );

    await pageQueue.addBulk(
      waiting.map((page) => ({
        name: PAGE_QUEUE,
        data: page.payload,
        opts: { ...JOB_OPTIONS, jobId: page.job_key },
      })),
    );

    await settle(jobKey, { state: "done" });
    await closeOut(cohortId);
  } catch (error) {
    await fail(job, jobKey, cohortId, error);
  }
}

/** One page: fetch it, drop it in S3, record what was written. */
async function handlePage(job: Job, context: TradeContext): Promise<void> {
  const jobKey = String(job.id);
  const data = job.data as PageJobData;

  if ((await claim(jobKey)) === undefined) return;

  try {
    const startedAt = Date.now();
    const answer = await fetchPage(data.hashes, data.searchId, context);
    const objectKey = await writePage(
      data.cohortId,
      data.queryId,
      data.page,
      answer.result,
    );

    await settle(jobKey, {
      state: "done",
      object_key: objectKey,
      item_count: answer.result.length,
      duration_ms: Date.now() - startedAt,
      fetched_at: new Date(),
    });
    await closeOut(data.cohortId);
  } catch (error) {
    await fail(job, jobKey, data.cohortId, error);
  }
}

/**
 * What the worker runs, by queue name. The `page` queue is passed in because a search's
 * whole purpose is to put work on it.
 */
export function createHandlers(
  pageQueue: Queue,
): Record<string, JobHandler> {
  return {
    [SEARCH_QUEUE]: (job, context) => handleSearch(job, context, pageQueue),
    [PAGE_QUEUE]: handlePage,
  };
}
