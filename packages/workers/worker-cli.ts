import { Queue } from "bullmq";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { closeDb } from "@poe/ledger/db";
import { createHandlers } from "./handlers.ts";
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

const worker = createWorker({
  queues: order,
  handlers: createHandlers(pageQueue, currencyHourQueue),
  // One per queue: search and fetch are metered under separate policies, so they are
  // separate budgets. Each limiter learns its own rules from the first response it sees.
  limiters: {
    [SEARCH_QUEUE]: createLimiter(OPENING_RULES, { smoothAbove: SMOOTH_ABOVE }),
    [PAGE_QUEUE]: createLimiter(OPENING_RULES, { smoothAbove: SMOOTH_ABOVE }),
    // The sweep makes no request at all; its limiter exists because every queue has one.
    [CURRENCY_QUEUE]: createLimiter(CDN_RULES),
    [CURRENCY_HOUR_QUEUE]: createLimiter(CDN_RULES),
  },
  cache: cacheFromEnv(),
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
