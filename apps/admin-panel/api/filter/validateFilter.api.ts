import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { UnfilteredReport } from "@poe/filter-validate/types";
import type { Lake } from "@poe/lake/types";
import type { DraftChanges } from "../taxonomy/types.ts";
import { stageWorking } from "../util/stage-working.ts";
import { runAction, runQuery } from "../util/yarn.ts";

const FILE_NAME = "unfiltered.json";

/**
 * The working version's compiled filter, checked against its own sample items: every sample
 * no block takes.
 *
 * Staged and published in a throwaway lake like `compileFilter`. The real lake is only read.
 */
export async function validateFilter(
  repo: string,
  lake: Lake,
  id: string,
  changes: DraftChanges,
): Promise<UnfilteredReport> {
  const root = await stageWorking(lake, id, changes);

  try {
    const published = await runAction(repo, ["taxonomy", "publish", id, `--root=${root}`]);
    if (!published.ok) throw new Error(published.log);

    const out = join(root, FILE_NAME);
    await runQuery<unknown>(repo, ["catalog:validate", `--taxonomy-version=${id}`, `--root=${root}`, `--out=${out}`]);

    return JSON.parse(await readFile(out, "utf8")) as UnfilteredReport;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
