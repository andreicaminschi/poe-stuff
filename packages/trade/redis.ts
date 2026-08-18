import type { ConnectionOptions } from "bullmq";
import { requireEnv } from "@util/core/env";

/**
 * BullMQ wants host and port rather than a URL, so `REDIS_URL` is taken apart here — one
 * variable to set, in the shape everything else in the stack uses.
 */
export function redisConnection(): ConnectionOptions {
  const url = new URL(requireEnv("REDIS_URL"));

  return {
    host: url.hostname,
    port: url.port === "" ? 6379 : Number(url.port),
    ...(url.username === "" ? {} : { username: url.username }),
    ...(url.password === "" ? {} : { password: url.password }),
    // BullMQ needs a connection that keeps retrying rather than one that gives up on a
    // command mid-flight.
    maxRetriesPerRequest: null,
  };
}
