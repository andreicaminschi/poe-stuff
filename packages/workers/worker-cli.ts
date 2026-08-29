import { Queue } from "bullmq";
import { createGGGService } from "@poe/ggg/service";
import { closeDb } from "@poe/ledger/db";
import { userAgent } from "./config.ts";
import { createHandlers } from "./handlers.ts";
import { logEvents } from "./log.ts";
import {
  CURRENCY_HOUR_QUEUE,
  CURRENCY_QUEUE,
  PAGE_QUEUE,
  SEARCH_QUEUE,
} from "./queues.ts";
import { redisClient } from "./redis.ts";
import { cacheFromEnv } from "./file-cache.ts";
import { createWorker } from "./worker.ts";

/**
 * Where the limiter starts. GGG's own headers replace this on the first answer, so it
 * only has to be slow enough to survive the very first request of a cold process.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

/**
 * Stop bursting once a tier is half spent. Riding a tier to its ceiling is what earns
 * restrictions: our count and the server's differ by one round trip, and the boundary
 * case is decided by that gap. Past halfway, requests go out at the tier's own rate.
 */
const SMOOTH_ABOVE = 0.5;

/**
 * What the currency queues are paced at. The CDN publishes no limits and shares no budget
 * with the trade API, so nothing here is learned from a header — one request a second is
 * simply what a backfill of several thousand hours should look like from the outside.
 */
const CDN_RULES = [{ max: 1, windowMs: 1_000 }];

/**
 * A worker process. The queue order is the argument, and it is the only thing that makes
 * one of these a search worker and another a page worker:
 *
 *     node --env-file=packages/workers/.env packages/workers/worker-cli.ts search page
 *     node --env-file=packages/workers/.env packages/workers/worker-cli.ts page search
 *     node --env-file=packages/workers/.env packages/workers/worker-cli.ts currency currency-hour
 */
const queues = process.argv.slice(2);
const order = queues.length > 0 ? queues : [SEARCH_QUEUE, PAGE_QUEUE];

const queueConnection = redisClient();
const pageQueue = new Queue(PAGE_QUEUE, { connection: queueConnection });
const currencyHourQueue = new Queue(CURRENCY_HOUR_QUEUE, {
  connection: queueConnection,
});

/**
 * The cache is shared: it is a store keyed by the request, so two services reading the
 * same one cannot answer each other's requests wrongly. Absent in production.
 */
const cache = cacheFromEnv();

/**
 * One service per queue, each holding its own limiter, because GGG meters search and
 * fetch under separate policies and a limiter holds one set of rules at a time.
 *
 * These share this process's IP, which is the budget GGG actually counts against. Scaling
 * out means another instance with another address running this same file, not more
 * services in here.
 */
const serviceFor = (
  rules: { max: number; windowMs: number }[],
  queue: string,
  smoothAbove?: number,
) =>
  createGGGService({
    userAgent: userAgent(),
    rules,
    cache,
    // Bound to the queue, not the job: a service is built once and outlives every job it
    // serves. The `job-start` and `job-done` lines are what bracket these.
    onEvent: logEvents({ queue }),
    ...(smoothAbove === undefined ? {} : { smoothAbove }),
  });

const worker = createWorker({
  queues: order,
  handlers: createHandlers(pageQueue, currencyHourQueue),
  services: {
    [SEARCH_QUEUE]: serviceFor(OPENING_RULES, SEARCH_QUEUE, SMOOTH_ABOVE),
    [PAGE_QUEUE]: serviceFor(OPENING_RULES, PAGE_QUEUE, SMOOTH_ABOVE),
    // The sweep makes no request at all; its service exists because every queue has one.
    [CURRENCY_QUEUE]: serviceFor(CDN_RULES, CURRENCY_QUEUE),
    [CURRENCY_HOUR_QUEUE]: serviceFor(CDN_RULES, CURRENCY_HOUR_QUEUE),
  },
  newConnection: redisClient,
});

async function shutdown(): Promise<void> {
  await worker.close();
  // Not `pageQueue.close()`: it waits on a client BullMQ was handed rather than made.
  queueConnection.disconnect();
  await closeDb();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await worker.run();
await shutdown();
