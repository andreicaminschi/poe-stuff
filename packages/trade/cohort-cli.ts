import { Queue } from "bullmq";
import type { JobsOptions } from "bullmq";
import {
  deprecate,
  failures,
  newCohort,
  repair,
} from "@poe/ledger/cohorts";
import { addSearches } from "@poe/ledger/jobs";
import { closeDb } from "@poe/ledger/db";
import type { JobRow, NewJob } from "@poe/ledger/types";
import { searchKey } from "./keys.ts";
import { deletePages } from "./pages.ts";
import { activeQueries, findQuery, loadQueries } from "./queries.ts";
import {
  ADD_CHUNK,
  JOB_OPTIONS,
  PAGE_QUEUE,
  REPAIR_PRIORITY,
  SEARCH_QUEUE,
} from "./queues.ts";
import { redisClient } from "./redis.ts";

/**
 * The commands that drive a cohort. The worker knows how to do the work; these decide
 * what work there is:
 *
 *     cohort-cli.ts start
 *     cohort-cli.ts failures <cohortId>
 *     cohort-cli.ts retry <cohortId>
 *     cohort-cli.ts replace <cohortId> <oldQueryId> <newQueryId>
 */
const connection = redisClient();
const queues = {
  [SEARCH_QUEUE]: new Queue(SEARCH_QUEUE, { connection }),
  [PAGE_QUEUE]: new Queue(PAGE_QUEUE, { connection }),
};

/** Rows go out in batches, because two thousand single adds is two thousand round trips. */
async function enqueue(
  rows: readonly Pick<JobRow, "job_key" | "kind" | "payload">[],
  options: JobsOptions = {},
): Promise<number> {
  for (let from = 0; from < rows.length; from += ADD_CHUNK) {
    const batch = rows.slice(from, from + ADD_CHUNK);

    await Promise.all(
      Object.entries(
        Object.groupBy(batch, (row) =>
          row.kind === "search" ? SEARCH_QUEUE : PAGE_QUEUE,
        ),
      ).map(([queue, grouped]) =>
        queues[queue as keyof typeof queues].addBulk(
          (grouped ?? []).map((row) => ({
            name: queue,
            data: row.payload,
            opts: { ...JOB_OPTIONS, ...options, jobId: row.job_key },
          })),
        ),
      ),
    );
  }

  return rows.length;
}

/**
 * A new cohort of every active query. Rows before jobs, so nothing can be waiting in
 * Redis that the ledger does not already know about.
 */
async function start(): Promise<void> {
  const file = await loadQueries();
  const queries = activeQueries(file);

  if (queries.length === 0) {
    throw new Error("no active queries in the query file");
  }

  const cohortId = await newCohort(file.digest);
  const searches: NewJob[] = queries.map((query) => ({
    job_key: searchKey(cohortId, query.id),
    query_id: query.id,
    kind: "search",
    payload: { cohortId, queryId: query.id },
  }));

  await addSearches(cohortId, searches);
  console.log(`${cohortId}: wrote ${searches.length} rows`);

  await enqueue(searches);
  console.log(`${cohortId}: queued ${searches.length} searches`);
}

/** What broke and how often. Read this before spending the budget on the same thing twice. */
async function report(cohortId: string): Promise<void> {
  const groups = await failures(cohortId);

  if (groups.length === 0) {
    console.log(`${cohortId}: nothing failed`);
    return;
  }

  for (const group of groups) {
    console.log(
      [
        String(group.count).padStart(5),
        group.query_id,
        group.kind,
        group.http_status ?? "-",
        group.error ?? "",
      ].join("  "),
    );
  }
}

/**
 * Every failed job back onto the pile, ahead of whatever else is queued: a cohort that
 * is being repaired should not wait behind a run that started later.
 */
async function retry(cohortId: string): Promise<void> {
  const rows = await repair(cohortId);
  await enqueue(rows, { priority: REPAIR_PRIORITY });

  console.log(`${cohortId}: queued ${rows.length} jobs again`);
}

/**
 * Swaps a broken query for its replacement inside a cohort that is already running. The
 * old query's jobs stop counting and the objects they wrote are deleted, so what stays in
 * S3 is only what the cohort still stands behind.
 */
async function replace(
  cohortId: string,
  oldQueryId: string,
  newQueryId: string,
): Promise<void> {
  const file = await loadQueries();
  const query = findQuery(file, newQueryId);

  const objects = await deprecate(cohortId, oldQueryId, file.digest);
  await deletePages(objects);

  const search: NewJob = {
    job_key: searchKey(cohortId, query.id),
    query_id: query.id,
    kind: "search",
    payload: { cohortId, queryId: query.id },
  };

  await addSearches(cohortId, [search]);
  await enqueue([search], { priority: REPAIR_PRIORITY });

  console.log(
    `${cohortId}: dropped ${oldQueryId} and ${objects.length} objects, queued ${newQueryId}`,
  );
}

const [command, ...args] = process.argv.slice(2);

/** Every command needs the cohort it works on, apart from the one that makes it. */
function cohortArg(): string {
  const [cohortId] = args;
  if (cohortId === undefined) throw new Error(`${command} needs a cohort id`);

  return cohortId;
}

try {
  switch (command) {
    case "start":
      await start();
      break;
    case "failures":
      await report(cohortArg());
      break;
    case "retry":
      await retry(cohortArg());
      break;
    case "replace": {
      const [cohortId, oldQueryId, newQueryId] = args;
      if (
        cohortId === undefined ||
        oldQueryId === undefined ||
        newQueryId === undefined
      ) {
        throw new Error("replace needs <cohortId> <oldQueryId> <newQueryId>");
      }

      await replace(cohortId, oldQueryId, newQueryId);
      break;
    }
    default:
      throw new Error(
        `unknown command ${command ?? ""}. Try start, failures, retry or replace`,
      );
  }
} finally {
  // The adds have already returned, so there is nothing left to flush. `close` on a queue
  // holding a client BullMQ was handed rather than made waits on that client, and `quit`
  // waits for a reply that never comes. Dropping the socket is what lets the process end.
  connection.disconnect();
  await closeDb();
}
