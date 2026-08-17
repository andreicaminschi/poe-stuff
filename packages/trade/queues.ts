import { Queue } from "bullmq";
import type { JobsOptions } from "bullmq";

import type { FetchJob, SearchJob } from "./jobs.ts";
import { newConnection } from "./redis.ts";

export const SEARCH_QUEUE = "trade-search";
export const FETCH_QUEUE = "trade-fetch";

/** Retries are BullMQ's job now; the worker only decides retryable vs not. */
export const JOB_OPTIONS: JobsOptions = {
  attempts: 4,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

let search: Queue<SearchJob> | undefined;
let fetch: Queue<FetchJob> | undefined;

export function searchQueue(): Queue<SearchJob> {
  search ??= new Queue<SearchJob>(SEARCH_QUEUE, { connection: newConnection() });
  return search;
}

export function fetchQueue(): Queue<FetchJob> {
  fetch ??= new Queue<FetchJob>(FETCH_QUEUE, { connection: newConnection() });
  return fetch;
}

export async function closeQueues(): Promise<void> {
  await search?.close();
  await fetch?.close();
  search = undefined;
  fetch = undefined;
}
