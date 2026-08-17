import type { Job } from "bullmq";

import { checkCompletion, flipLatest, markDone, markFailed } from "../version.ts";

/**
 * BullMQ emits `failed` on every attempt. Only the last one is worth recording
 * against the version.
 */
export async function onPermanentFailure(job: Job | undefined, error: Error): Promise<void> {
  if (job === undefined) return;

  const attempts = job.opts.attempts ?? 1;
  const exhausted = job.attemptsMade >= attempts;
  if (!exhausted && error.name !== "UnrecoverableError") return;

  const versionId = job.data?.versionId;
  const queryId = job.data?.queryId;
  if (typeof versionId !== "string" || typeof queryId !== "string") return;

  console.error(`[failed] ${queryId}: ${error.message}`);
  await markFailed(versionId, queryId);
}

/**
 * Marks a query finished and flips the pointer if it was the last one needed.
 * Runs on whichever task closes the query — completion state is shared, so any
 * instance can be the one that commits.
 */
export async function completeQuery(versionId: string, queryId: string): Promise<void> {
  await markDone(versionId, queryId);

  const completion = await checkCompletion(versionId);
  console.error(`[version] ${completion.done}/${completion.expected} done`);
  if (!completion.complete) return;

  const latest = await flipLatest(versionId, completion.missing);
  console.error(
    `[version] ${versionId} is now latest (${latest.queries} queries, ${latest.missing.length} missing)`,
  );
}
