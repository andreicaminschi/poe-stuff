import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { commitLedger } from "../ledger/commit.api.ts";
import { saveDraft } from "../taxonomy/saveDraft.api.ts";
import type { DraftChanges } from "../taxonomy/types.ts";
import { ledgerKey, registryKey, sourceKey, type SourceFile } from "./keys.ts";

const FILES: readonly SourceFile[] = [
  "items",
  "categories",
  "authored.seeded",
  "authored.manual",
  "variants.seeded",
  "variants.manual",
];

/**
 * A throwaway lake holding the working version: the draft's files, the ledger applied, then
 * the unsaved edits applied. Returns its root, and the caller removes it.
 *
 * The real lake is only read.
 */
export async function stageWorking(lake: Lake, id: string, changes: DraftChanges): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "poe-working-"));

  try {
    const staged = createLakeService({ root });

    for (const key of [registryKey(), ledgerKey(id), ...FILES.map((file) => sourceKey(id, file))]) {
      if (await lake.exists(key)) await staged.writeJson(key, await lake.readJson(key));
    }

    await commitLedger(staged, id);
    if (changes.items !== undefined || changes.categories !== undefined) await saveDraft(staged, id, changes);

    return root;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
