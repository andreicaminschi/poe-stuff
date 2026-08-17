import { readFile } from "node:fs/promises";

import { league } from "../env.ts";
import { CatalogueSchema } from "../jobs.ts";
import type { SearchJob } from "../jobs.ts";
import { closeQueues, JOB_OPTIONS, searchQueue } from "../queues.ts";
import { closeRedis } from "../redis.ts";
import { newVersionId, writeManifest } from "../version.ts";

const args = process.argv.slice(2);
const cataloguePath = args[0];

if (cataloguePath === undefined || args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "Usage: node --env-file=packages/trade/.env packages/trade/tools/enqueue.ts <catalogue.json>",
      "",
      "Opens a new version, writes its manifest, and queues one search per entry.",
      "Catalogue: [{ queryId, query, required?, pages? }]  pages default 3, 10 results each",
    ].join("\n"),
  );
  process.exit(cataloguePath === undefined ? 1 : 0);
}

const catalogue = CatalogueSchema.parse(JSON.parse(await readFile(cataloguePath, "utf8")));
const versionId = newVersionId();
const currentLeague = league();

await writeManifest({
  versionId,
  startedAt: new Date().toISOString(),
  league: currentLeague,
  expected: catalogue.map((spec) => ({
    queryId: spec.queryId,
    required: spec.required,
    pages: spec.pages,
  })),
});

await searchQueue().addBulk(
  catalogue.map((spec) => ({
    name: spec.queryId,
    data: {
      versionId,
      queryId: spec.queryId,
      league: currentLeague,
      query: spec.query,
      pages: spec.pages,
      phase: "search",
    } satisfies SearchJob,
    // Deterministic id: re-running enqueue for the same version cannot double
    // up on a query that is already in flight. `__` not `:` — BullMQ rejects
    // colons in custom job ids.
    opts: { ...JOB_OPTIONS, jobId: `${versionId}__${spec.queryId}` },
  })),
);

console.log(`version ${versionId}: queued ${catalogue.length} searches`);
await closeQueues();
await closeRedis();
