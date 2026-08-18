import { randomUUID } from "node:crypto";
import { Worker } from "bullmq";
import type { Job } from "bullmq";
import type { Redis } from "ioredis";
import type { RateLimiter, ResponseCache } from "@poe/ggg/types";
import { log, logEvents } from "./log.ts";
import type { TradeContext } from "./types.ts";

/**
 * BullMQ's own defaults, named because the loop leans on both: the lock is what a job
 * holds while it waits out a rate-limit penalty, and the drain delay is how long the
 * worker parks on its own queue before looking at the others again.
 */
const LOCK_DURATION_MS = 30_000;
const DRAIN_DELAY_SECONDS = 5;

/** Renew well inside the lock, so one slow round trip does not lose the job. */
const RENEW_EVERY = 2;

export type JobHandler = (job: Job, context: TradeContext) => Promise<void>;

export type WorkerConfig = {
  /**
   * The queues this worker reads, in the order it prefers them. The first one is its
   * own: it is the queue the worker waits on when everything is empty, so work arriving
   * there is picked up immediately and the rest only when there is nothing else to do.
   */
  queues: readonly string[];
  /** One per queue name. A queue with no handler is a config mistake, not a silent skip. */
  handlers: Readonly<Record<string, JobHandler>>;
  /**
   * One limiter per queue, because GGG meters each endpoint under its own policy: the
   * searches and the fetches draw on separate budgets against the same IP, and one
   * limiter can only hold one set of rules at a time. Keyed like `handlers`.
   */
  limiters: Readonly<Record<string, RateLimiter>>;
  /** Present on a laptop, absent in production. Handed to every handler as it is. */
  cache?: ResponseCache;
  /** A fresh client per call: each queue reader blocks on its own connection. */
  newConnection: () => Redis;
  lockDurationMs?: number;
  drainDelaySeconds?: number;
};

export type RunningWorker = {
  /** Resolves when the worker has been closed, not when the queues are empty. */
  run(): Promise<void>;
  close(): Promise<void>;
};

const asError = (thrown: unknown): Error =>
  thrown instanceof Error ? thrown : new Error(String(thrown));

/**
 * Keeps the job's lock alive for as long as the handler runs. A job parked in
 * `acquire()` behind a 429 outlives the 30 second lock several times over, and without
 * this the stalled check would hand it to a second worker while the first is still
 * making the request.
 *
 * A failed renewal is not worth acting on here: the lock is already gone, and the settle
 * that follows will say so.
 */
function renewLock(job: Job, token: string, lockMs: number): () => void {
  const timer = setInterval(() => {
    job.extendLock(token, lockMs).catch(() => {});
  }, Math.floor(lockMs / RENEW_EVERY));

  return () => clearInterval(timer);
}

/**
 * A worker process. Every worker runs this same loop; what makes one a search worker and
 * another a page worker is the order of `queues`.
 *
 * The BullMQ `Worker` objects are built with a `null` processor, so none of them runs a
 * loop of its own — each is only a way to ask its queue for the next job, and the order
 * of the asking is decided here.
 */
export function createWorker(config: WorkerConfig): RunningWorker {
  const {
    queues,
    handlers,
    limiters,
    cache,
    newConnection,
    lockDurationMs = LOCK_DURATION_MS,
    drainDelaySeconds = DRAIN_DELAY_SECONDS,
  } = config;

  const [first, ...rest] = queues;
  if (first === undefined) {
    throw new RangeError("a worker needs at least one queue");
  }

  const missing = queues.filter(
    (queue) => handlers[queue] === undefined || limiters[queue] === undefined,
  );
  if (missing.length > 0) {
    throw new RangeError(
      `a handler and a limiter are needed for: ${missing.join(", ")}`,
    );
  }

  // Every reader gets its own client: one parked in a blocking read holds that
  // connection for as long as it waits. BullMQ leaves a client it was handed open, so
  // these are ours to close.
  const clients: Redis[] = [];

  const asWorker = (queue: string) => {
    const connection = newConnection();
    clients.push(connection);

    return new Worker(queue, null, {
      connection,
      lockDuration: lockDurationMs,
      drainDelay: drainDelaySeconds,
      // Nothing to autorun: with no processor, this worker only hands out jobs.
      autorun: false,
    });
  };

  // `own` is built apart from the rest so the queue this worker waits on is a value, not
  // a lookup that has to be proven non-empty at every use.
  const own = asWorker(first);
  const workers = [own, ...rest.map(asWorker)];

  let running = false;

  /**
   * The priority rule. Every queue is asked without waiting, in order, and the first job
   * found wins. Only when they are all empty does the worker wait, and it waits on its
   * own queue alone — which is why a fallback job can sit for up to `drainDelay`.
   */
  async function take(token: string): Promise<Job | undefined> {
    for (const worker of workers) {
      const job = await worker.getNextJob(token, { block: false });
      if (job !== undefined) return job;
    }

    return own.getNextJob(token, { block: true });
  }

  async function settle(job: Job, token: string, failure?: Error): Promise<void> {
    try {
      if (failure === undefined) {
        await job.moveToCompleted(undefined, token, false);
      } else {
        await job.moveToFailed(failure, token, false);
      }
    } catch (error) {
      // The lock was lost while the handler ran, so this job now belongs to whichever
      // worker the stalled check gave it to. Nothing to do but say so and move on.
      log(
        { queue: job.queueName, job: job.id ?? "" },
        { type: "settle-failed", message: asError(error).message },
      );
    }
  }

  async function work(job: Job, token: string): Promise<void> {
    const labels = { queue: job.queueName, job: job.id ?? "" };
    const stopRenewing = renewLock(job, token, lockDurationMs);
    const handler = handlers[job.queueName];
    const limiter = limiters[job.queueName];

    try {
      if (handler === undefined || limiter === undefined) {
        throw new RangeError(`nothing configured for queue ${job.queueName}`);
      }

      await handler(job, { limiter, cache, onEvent: logEvents(labels) });
      await settle(job, token);
    } catch (error) {
      await settle(job, token, asError(error));
    } finally {
      stopRenewing();
    }
  }

  return {
    async run() {
      running = true;

      await Promise.all(workers.map((worker) => worker.waitUntilReady()));
      // Manual mode runs no stalled checker of its own. Without this, a job whose worker
      // died stays active for good and its cohort never finishes.
      await Promise.all(workers.map((worker) => worker.startStalledCheckTimer()));

      while (running) {
        // A token per attempt, so a renewal left over from the last job cannot touch
        // the next one.
        const token = randomUUID();

        let job: Job | undefined;
        try {
          job = await take(token);
        } catch (error) {
          // `close` aborts whatever the blocking read was doing. Anything else is worth
          // a line before the loop tries again.
          if (running) {
            log({}, { type: "take-failed", message: asError(error).message });
          }
          continue;
        }

        if (job !== undefined) await work(job, token);
      }
    },

    async close() {
      running = false;
      await Promise.all(workers.map((worker) => worker.close()));
      // `disconnect`, not `quit`: a client parked in a blocking read never answers a QUIT.
      clients.forEach((client) => client.disconnect());
    },
  };
}
