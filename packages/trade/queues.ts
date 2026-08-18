import type { JobsOptions } from "bullmq";

export const SEARCH_QUEUE = "search";
export const PAGE_QUEUE = "page";

/**
 * Redis only needs a job while it is waiting or running: the ledger is the history, so a
 * completed job is dropped. Failed ones stay, capped, because that is the quickest way to
 * see what is going wrong while a run is live.
 */
export const JOB_OPTIONS: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: { count: 1000 },
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
};

/** Repaired work goes ahead of a run that started after it. */
export const REPAIR_PRIORITY = 1;

/** Adds go out in batches: a cohort is a couple of thousand jobs, not a couple of dozen. */
export const ADD_CHUNK = 500;
