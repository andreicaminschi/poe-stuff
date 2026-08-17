/**
 * Redis keys we own directly. BullMQ owns everything queue-shaped under its own
 * prefix; rate limiting is per-IP and lives in worker memory. What is left is
 * version bookkeeping, which genuinely spans instances.
 */

const PREFIX = "trade";

/** Query ids finished in this version. Compared against the manifest. */
export const doneQueries = (versionId: string) => `${PREFIX}:v:${versionId}:done`;

/** Query ids that exhausted retries. Recorded as missing when the version ships. */
export const failedQueries = (versionId: string) => `${PREFIX}:v:${versionId}:failed`;
