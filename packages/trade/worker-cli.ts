import { Queue } from "bullmq";
import { createLimiter } from "@poe/ggg/rate-limiter";
import { closeDb } from "@poe/ledger/db";
import { createHandlers } from "./handlers.ts";
import { PAGE_QUEUE, SEARCH_QUEUE } from "./queues.ts";
import { redisConnection } from "./redis.ts";
import { cacheFromEnv } from "./s3-cache.ts";
import { createWorker } from "./worker.ts";

/**
 * Where the limiter starts. GGG's own headers replace this on the first answer, so it
 * only has to be slow enough to survive the very first request of a cold process.
 */
const OPENING_RULES = [{ max: 1, windowMs: 1_000 }];

/**
 * A worker process. The queue order is the argument, and it is the only thing that makes
 * one of these a search worker and another a page worker:
 *
 *     node --env-file=packages/trade/.env packages/trade/worker-cli.ts search page
 *     node --env-file=packages/trade/.env packages/trade/worker-cli.ts page search
 */
const queues = process.argv.slice(2);
const order = queues.length > 0 ? queues : [SEARCH_QUEUE, PAGE_QUEUE];

const connection = redisConnection();
const pageQueue = new Queue(PAGE_QUEUE, { connection });

const worker = createWorker({
  queues: order,
  handlers: createHandlers(pageQueue),
  // One limiter for the process, because one limiter is one IP.
  limiter: createLimiter(OPENING_RULES),
  cache: cacheFromEnv(),
  connection,
});

async function shutdown(): Promise<void> {
  await worker.close();
  await pageQueue.close();
  await closeDb();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await worker.run();
await shutdown();
