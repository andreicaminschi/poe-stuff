import { Redis } from "ioredis";

import { redisUrl } from "./env.ts";

/**
 * BullMQ blocks on its own connections, so workers get their own rather than
 * sharing. `maxRetriesPerRequest: null` is required by BullMQ.
 */
export function newConnection(): Redis {
  return new Redis(redisUrl(), { maxRetriesPerRequest: null });
}

let shared: Redis | undefined;

/** Shared connection for our own key reads — version bookkeeping only. */
export function redis(): Redis {
  if (shared === undefined) shared = newConnection();
  return shared;
}

export async function closeRedis(): Promise<void> {
  if (shared !== undefined) {
    await shared.quit();
    shared = undefined;
  }
}
