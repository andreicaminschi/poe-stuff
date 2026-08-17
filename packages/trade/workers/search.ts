import { UnrecoverableError, WaitingChildrenError, Worker } from "bullmq";

import { FETCH_CHUNK, postSearch } from "../api.ts";
import { queryHash, readSearch, writeSearch } from "../cache.ts";
import { readSearchJob } from "../jobs.ts";
import type { FetchJob, SearchJob } from "../jobs.ts";
import { fetchQueue, JOB_OPTIONS, SEARCH_QUEUE } from "../queues.ts";
import { newConnection } from "../redis.ts";
import { RateLimiter, SEARCH_POLICY } from "../throttle.ts";
import { completeQuery, onPermanentFailure } from "./shared.ts";

/**
 * One search worker per task. `concurrency: 1` is load-bearing — the limiter
 * models a single in-flight request per IP, and each task owns its own IP.
 * Scale by running more tasks, never by raising concurrency.
 */
export function createSearchWorker(): Worker<SearchJob> {
  const limiter = new RateLimiter(SEARCH_POLICY);

  const worker = new Worker<SearchJob>(
    SEARCH_QUEUE,
    async (job, token) => {
      const data = readSearchJob(job.data);

      // Second visit: every page has landed (or been given up on), so the
      // query is finished and may be the one that completes the version.
      if (data.phase === "collect") {
        await completeQuery(data.versionId, data.queryId);
        return;
      }

      const hash = queryHash(data.league, data.query);
      let cached = await readSearch(hash);

      if (cached === undefined) {
        const result = await postSearch(limiter, data.query, data.league);

        if (!result.ok) {
          if (!result.retryable) {
            throw new UnrecoverableError(`search ${data.queryId} failed: ${result.status}`);
          }
          throw new Error(`search ${data.queryId} failed: ${result.status}`);
        }

        cached = {
          searchId: result.body.id,
          total: result.body.total,
          result: result.body.result,
          league: data.league,
          cachedAt: new Date().toISOString(),
        };
        await writeSearch(hash, cached);
      } else {
        console.error(`[search] ${data.queryId}: cache hit ${cached.searchId}`);
      }

      const searchId = cached.searchId;
      const hashes = cached.result.slice(0, data.pages * FETCH_CHUNK);
      console.error(
        `[search] ${data.queryId}: total ${cached.total}, taking ${hashes.length} (${data.pages}p)`,
      );

      if (hashes.length === 0) {
        await completeQuery(data.versionId, data.queryId);
        return;
      }

      const pages: string[][] = [];
      for (let i = 0; i < hashes.length; i += FETCH_CHUNK) {
        pages.push(hashes.slice(i, i + FETCH_CHUNK));
      }

      await fetchQueue().addBulk(
        pages.map((page, index) => ({
          name: `${data.queryId}#${index}`,
          data: {
            versionId: data.versionId,
            queryId: data.queryId,
            searchId,
            total: cached.total,
            hashes: page,
            page: index + 1,
          } satisfies FetchJob,
          opts: {
            ...JOB_OPTIONS,
            parent: { id: job.id ?? "", queue: job.queueQualifiedName },
            // A page that dies for good must not strand the parent: the query
            // completes with the pages that did land, and the gap shows up in
            // the version's missing list.
            ignoreDependencyOnFailure: true,
          },
        })),
      );

      await job.updateData({ ...data, phase: "collect" });

      if (token !== undefined && (await job.moveToWaitingChildren(token))) {
        throw new WaitingChildrenError();
      }
    },
    { connection: newConnection(), concurrency: 1 },
  );

  worker.on("failed", onPermanentFailure);
  return worker;
}
