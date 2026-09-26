import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import type { Lake } from "@poe/lake/types";
import { registryKey, sourceKey, type SourceFile } from "./keys.ts";

export type TempLake = { readonly root: string; readonly lake: Lake; readonly remove: () => Promise<void> };

export async function tempLake(): Promise<TempLake> {
  const root = await mkdtemp(join(tmpdir(), "admin-panel-test-"));
  return { root, lake: createLakeService({ root }), remove: () => rm(root, { recursive: true, force: true }) };
}

export const FILES: readonly SourceFile[] = [
  "items",
  "categories",
  "authored.seeded",
  "authored.manual",
  "variants.seeded",
  "variants.manual",
];

export async function seedDraft(
  lake: Lake,
  id: string,
  files: Partial<Record<SourceFile, unknown>> = {},
): Promise<void> {
  await lake.writeJson(registryKey(), {
    next: 2,
    versions: { [id]: { state: "draft", createdAt: "2026-01-01T00:00:00Z" } },
  });
  for (const file of FILES) await lake.writeJson(sourceKey(id, file), files[file] ?? {});
}
