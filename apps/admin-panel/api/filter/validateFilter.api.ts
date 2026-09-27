import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UnfilteredReport } from "@poe/filter-validate/types";
import type { Lake } from "@poe/lake/types";
import type { DraftChanges } from "../taxonomy/types.ts";
import { withPublishedWorking } from "../util/stage-working.ts";
import { runQuery } from "../util/yarn.ts";

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
  return withPublishedWorking(repo, lake, id, changes, async (root) => {
    const out = join(root, FILE_NAME);
    await runQuery<unknown>(repo, ["catalog:validate", `--taxonomy-version=${id}`, `--root=${root}`, `--out=${out}`]);

    return JSON.parse(await readFile(out, "utf8")) as UnfilteredReport;
  });
}
