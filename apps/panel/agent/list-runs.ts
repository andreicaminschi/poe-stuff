import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { ModelRun } from "../contract.ts";

/** Lists every run with an `export/export.json`, newest export first. */
export async function listRuns(runsDir: string): Promise<readonly ModelRun[]> {
  const folders = await readdir(runsDir, { withFileTypes: true }).catch(() => []);
  const runs = await Promise.all(folders.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const info = await stat(join(runsDir, entry.name, "export", "export.json")).catch(() => undefined);
    return info === undefined
      ? []
      : [{ run: entry.name, exportedAt: info.mtime.toISOString() }];
  }));

  return runs.flat().sort((left, right) => right.exportedAt.localeCompare(left.exportedAt));
}
