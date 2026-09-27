import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { commitLedger } from "../ledger/commit.api.ts";
import { saveDraft } from "../taxonomy/saveDraft.api.ts";
import type { DraftChanges } from "../taxonomy/types.ts";
import { ledgerKey, registryKey, sourceKey, type SourceFile } from "./keys.ts";
import { runAction } from "./yarn.ts";
import { readOr } from "./read-or.ts";
import { EMPTY_REGISTRY } from "../taxonomy/getVersions.api.ts";

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

/**
 * A published version's merged files copied into a throwaway lake, handed to `work`, then
 * removed. Nothing to publish: they already exist.
 */
async function withPublished<T>(lake: Lake, id: string, work: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "poe-working-"));

  try {
    const staged = createLakeService({ root });
    for (const key of [`taxonomy/${id}.json`, `taxonomy/${id}.categories.json`]) {
      await staged.writeJson(key, await lake.readJson(key));
    }

    return await work(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/**
 * The working version staged and published in a throwaway lake, handed to `work`, then
 * removed whatever happens. Publishing is what validates it.
 */
export async function withPublishedWorking<T>(
  repo: string,
  lake: Lake,
  id: string,
  changes: DraftChanges,
  work: (root: string) => Promise<T>,
): Promise<T> {
  const registry = await readOr(lake, registryKey(), EMPTY_REGISTRY);
  if (registry.versions[id]?.state === "published") return withPublished(lake, id, work);

  const root = await stageWorking(lake, id, changes);

  try {
    const published = await runAction(repo, ["taxonomy", "publish", id, `--root=${root}`]);
    if (!published.ok) throw new Error(published.log);

    return await work(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
