import { closeQueues } from "../queues.ts";
import { closeRedis } from "../redis.ts";
import { createSearchWorker } from "../workers/search.ts";

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "Usage: node --env-file=packages/trade/.env packages/trade/tools/search-worker.ts",
      "",
      "Runs the trade-search queue: one request at a time, paced against this",
      "task's own IP budget. Dispatches one fetch job per page.",
      "Scale by running more tasks, never by raising concurrency.",
    ].join("\n"),
  );
  process.exit(0);
}

const worker = createSearchWorker();
console.error("[search] worker online");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    console.error(`[search] ${signal}, draining`);
    await worker.close();
    await closeQueues();
    await closeRedis();
  });
}
