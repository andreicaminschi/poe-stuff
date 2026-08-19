import { UnrecoverableError } from "bullmq";
import type { Job, Queue } from "bullmq";
import { GggHttpError } from "@poe/ggg/errors";
import { fetchCurrencyHour } from "@poe/ggg/fetch-currency-hour";
import { fetchPage } from "@poe/ggg/fetch-page";
import { search } from "@poe/ggg/search";
import type { GggContext } from "@poe/ggg/types";
import { finish, getCohort, outstanding, promote } from "@poe/ledger/cohorts";
import { claimHour, openHours, settleHour } from "@poe/ledger/currency";
import { addPages, claim, pagesFor, settle } from "@poe/ledger/jobs";
import type { NewJob } from "@poe/ledger/types";
import {
  FETCH_CHUNK,
  MAX_PAGES,
  currencyFromHour,
  currencyLeague,
  latestCurrencyHour,
} from "./config.ts";
import { currencyHourKey, pageKey } from "./keys.ts";
import { log } from "./log.ts";
import { writeCurrencyHour, writeLatest, writePage } from "./pages.ts";
import { findQuery, loadQueries } from "./queries.ts";
import {
  ADD_CHUNK,
  CURRENCY_HOUR_QUEUE,
  CURRENCY_QUEUE,
  JOB_OPTIONS,
  PAGE_QUEUE,
  SEARCH_QUEUE,
} from "./queues.ts";
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
 * The page jobs one search produced: its first `maxPages`, ten hashes each, keyed by the
 * cohort, the query and the position — so a second search of the same query lands on the
 * same keys and Postgres can reject it.
 *
 * Results come back sorted by price, so the pages kept are the cheap end, which is the
 * part of a listing that describes the market.
 */
function pageJobs(
  cohortId: string,
  queryId: string,
  searchId: string,
  hashes: readonly string[],
  maxPages: number,
): NewJob[] {
  const jobs: NewJob[] = [];
  const wanted = hashes.slice(0, maxPages * FETCH_CHUNK);

  for (let page = 0; page * FETCH_CHUNK < wanted.length; page++) {
    jobs.push({
      job_key: pageKey(cohortId, queryId, page),
      query_id: queryId,
      kind: "page",
      payload: {
        cohortId,
        queryId,
        searchId,
        page,
        hashes: wanted.slice(page * FETCH_CHUNK, (page + 1) * FETCH_CHUNK),
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
  context: GggContext,
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
      const answer = await search(query.body, query.league, context);

      await addPages(
        cohortId,
        jobKey,
        pageJobs(
          cohortId,
          queryId,
          answer.id,
          answer.result,
          query.maxPages ?? MAX_PAGES,
        ),
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
async function handlePage(job: Job, context: GggContext): Promise<void> {
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

export type CurrencyHourJobData = { league: string; hourId: number };

/**
 * The hourly sweep: every hour this league still owes, from the floor set by hand up to
 * the newest one the endpoint serves, queued one job each.
 *
 * Rows before jobs, the same way a cohort starts — the ledger is what says an hour is
 * outstanding, so nothing may be waiting in redis that it does not already know about.
 * It is the repair pass too: `openHours` takes back an hour that failed for a reason
 * worth retrying, and leaves alone one the endpoint answered with a 404.
 *
 * Backfilling is therefore not a separate mode. A sweep asks for the whole range every
 * time and the ledger subtracts what is already there, so the first run after the floor
 * is moved queues the history and the ones after it queue an hour.
 */
async function handleCurrencySweep(job: Job, hourQueue: Queue): Promise<void> {
  const league = currencyLeague();
  const hours = await openHours(
    league,
    currencyFromHour(),
    latestCurrencyHour(),
  );

  for (let from = 0; from < hours.length; from += ADD_CHUNK) {
    await hourQueue.addBulk(
      hours.slice(from, from + ADD_CHUNK).map((hourId) => ({
        name: CURRENCY_HOUR_QUEUE,
        data: { league, hourId } satisfies CurrencyHourJobData,
        opts: { ...JOB_OPTIONS, jobId: currencyHourKey(league, hourId) },
      })),
    );
  }

  log(
    { queue: CURRENCY_QUEUE, job: String(job.id) },
    { type: "sweep", league, hours: hours.length },
  );
}

/**
 * The currency half of `fail`. No cohort to close out — an hour stands alone — and a
 * failed row is left for the next sweep to judge rather than retried here.
 */
async function failHour(
  job: Job,
  league: string,
  hourId: number,
  error: unknown,
): Promise<never> {
  const http = error instanceof GggHttpError ? error : undefined;
  const lastAttempt = job.attemptsStarted >= (job.opts.attempts ?? 1);

  if (http?.retryable === true && !lastAttempt) throw error;

  await settleHour(league, hourId, {
    state: "failed",
    error: message(error),
    http_status: http?.status,
  });

  throw new UnrecoverableError(message(error));
}

/**
 * One hour: fetch it, keep the one league, drop it in S3, record what was written.
 *
 * An hour with no markets for this league still counts as collected — the league had no
 * activity, or had not started yet — so the row settles `done` with a count of zero and
 * no object rather than leaving an empty file for a reader to open.
 */
async function handleCurrencyHour(
  job: Job,
  context: GggContext,
): Promise<void> {
  const { league, hourId } = job.data as CurrencyHourJobData;

  if ((await claimHour(league, hourId)) === undefined) return;

  try {
    const startedAt = Date.now();
    const answer = await fetchCurrencyHour(hourId, context);
    const markets = answer.markets.filter(
      (market) => market.league === league,
    );

    await settleHour(league, hourId, {
      state: "done",
      object_key:
        markets.length === 0
          ? undefined
          : await writeCurrencyHour(league, hourId, markets),
      market_count: markets.length,
      duration_ms: Date.now() - startedAt,
      fetched_at: new Date(),
    });
  } catch (error) {
    await failHour(job, league, hourId, error);
  }
}

/**
 * What the worker runs, by queue name. A queue is passed in wherever a job fans out onto
 * another one: a search produces pages, a sweep produces hours.
 */
export function createHandlers(
  pageQueue: Queue,
  currencyHourQueue: Queue,
): Record<string, JobHandler> {
  return {
    [SEARCH_QUEUE]: (job, context) => handleSearch(job, context, pageQueue),
    [PAGE_QUEUE]: handlePage,
    [CURRENCY_QUEUE]: (job) => handleCurrencySweep(job, currencyHourQueue),
    [CURRENCY_HOUR_QUEUE]: handleCurrencyHour,
  };
}
