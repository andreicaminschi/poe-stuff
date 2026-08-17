import { closeQueues } from "../queues.ts";
import { closeRedis } from "../redis.ts";
import { createFetchWorker } from "../workers/fetch.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: node --env-file=packages/trade/.env packages/trade/tools/fetch-worker.ts",
      "",
      "Runs the trade-fetch queue: one page at a time, paced against this",
      "task's own IP budget. Writes raw rows into the version directory.",
      "Scale by running more tasks, never by raising concurrency.",
    ].join("\n"),
  );
  process.exit(0);
}

const worker = createFetchWorker();
console.error("[fetch] worker online");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    console.error(`[fetch] ${signal}, draining`);
    await worker.close();
    await closeQueues();
    await closeRedis();
  });
}
