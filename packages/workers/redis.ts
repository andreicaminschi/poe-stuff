import { Redis } from "ioredis";
import { requireEnv } from "@util/core/env";

/**
 * A new client every call, not a shared one.
 *
 * BullMQ is handed a client rather than connection options because it cannot load
 * `ioredis` itself under native ESM. That makes the connections ours to manage: queues
 * can share one, but a worker parked in a blocking read holds its connection for the
 * length of that read, so each one gets its own.
 *
 * `maxRetriesPerRequest: null` is BullMQ's requirement — a command that gives up
 * mid-flight would look like a job that vanished.
 */
export function redisClient(): Redis {
  return new Redis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: null });
}
