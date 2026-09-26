import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Lake } from "@poe/lake/types";
import type { DraftChanges } from "../taxonomy/types.ts";
import { withPublishedWorking } from "../util/stage-working.ts";
import { runQuery } from "../util/yarn.ts";

export type CompileSkip = { readonly key: string; readonly variant?: string; readonly problem: string };

export type CompiledFilter = {
  readonly path: string;
  readonly blocks: number;
  readonly skipped: readonly CompileSkip[];
};

type CompileOutput = { readonly blocks: number; readonly skipped: readonly CompileSkip[] };

const FILE_NAME = "taxonomy-compiled.filter";

/**
 * The working version — the draft, the ledger and the unsaved edits — compiled into a filter
 * in the PoE folder.
 *
 * The working version is staged in a throwaway lake and published there, which validates it.
 * The real lake is only read.
 */
export async function compileFilter(
  repo: string,
  lake: Lake,
  id: string,
  documents: string,
  changes: DraftChanges,
): Promise<CompiledFilter> {
  return withPublishedWorking(repo, lake, id, changes, async (root) => {
    const out = join(root, FILE_NAME);
    const result = await runQuery<CompileOutput>(repo, [
      "catalog:compile",
      `--taxonomy-version=${id}`,
      `--root=${root}`,
      `--out=${out}`,
    ]);

    const folder = join(documents, "My Games", "Path of Exile");
    await mkdir(folder, { recursive: true });
    const path = join(folder, FILE_NAME);
    await copyFile(out, path);

    return { path, blocks: result.blocks, skipped: result.skipped };
  });
}
