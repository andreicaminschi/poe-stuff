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

/** The hourly sweep: works out which hours are missing and queues one job each. */
export const CURRENCY_QUEUE = "currency";

/** One job is one hour of Currency Exchange history. */
export const CURRENCY_HOUR_QUEUE = "currency-hour";

/**
 * The sweep runs on a BullMQ job scheduler, which keeps the schedule in redis and hands
 * the due job to whichever worker asks for it. That is deliberately not a cron: there is
 * no machine that has to be up at the top of the hour, and a worker started late still
 * picks up the tick it missed.
 */
export const CURRENCY_SCHEDULER = "currency-hourly";

/** On the hour. The lag in `CURRENCY_LAG_HOURS` decides which hour that collects. */
export const CURRENCY_PATTERN = "0 * * * *";
