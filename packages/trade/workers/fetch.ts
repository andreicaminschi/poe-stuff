import { UnrecoverableError, Worker } from "bullmq";

import { getFetch } from "../api.ts";
import { readPage, writePage } from "../cache.ts";
import { readFetchJob } from "../jobs.ts";
import type { FetchJob } from "../jobs.ts";
import { FETCH_QUEUE } from "../queues.ts";
import { newConnection } from "../redis.ts";
import { FETCH_POLICY, RateLimiter } from "../throttle.ts";
import { appendRows } from "../sink.ts";
import { onPermanentFailure } from "./shared.ts";

/**
 * One fetch worker per task, own IP, own budget. Scaled independently of the
 * search pool: at three pages per search this queue takes roughly three times
 * the requests, against a tighter 6h cap.
 */
export function createFetchWorker(): Worker<FetchJob> {
  const limiter = new RateLimiter(FETCH_POLICY);

  const worker = new Worker<FetchJob>(
    FETCH_QUEUE,
    async (job) => {
      const data = readFetchJob(job.data);

      let cached = await readPage(data.searchId, data.page);

      if (cached === undefined) {
        const result = await getFetch(limiter, data.hashes, data.searchId);

        if (!result.ok) {
          if (!result.retryable) {
            throw new UnrecoverableError(`fetch ${data.queryId} failed: ${result.status}`);
          }
          throw new Error(`fetch ${data.queryId} failed: ${result.status}`);
        }

        cached = {
          searchId: data.searchId,
          page: data.page,
          rows: result.body.result,
          cachedAt: new Date().toISOString(),
        };
        await writePage(data.searchId, data.page, cached);
      } else {
        console.error(`[fetch] ${data.queryId} p${data.page}: cache hit`);
      }

      const written = await appendRows(
        data.versionId,
        data.queryId,
        data.searchId,
        data.total,
        cached.rows,
      );
      console.error(`[fetch] ${data.queryId} p${data.page}: +${written} rows`);
    },
    { connection: newConnection(), concurrency: 1 },
  );

  worker.on("failed", onPermanentFailure);
  return worker;
}
