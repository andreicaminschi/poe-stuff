import { createLakeService } from "@poe/lake/service";
import { checkState } from "@poe/panel-state/check-state";
import type { Lake } from "@poe/lake/types";
import { convertPatch, type LegacyPatch } from "./migrate-tag-seeders/convert-patch.ts";
import { convertState, type LegacyState } from "./migrate-tag-seeders/convert-state.ts";
import type { Entry } from "./session.ts";
import { SPLIT_DEFAULTS } from "@poe/panel-state/split-defaults";
import type { Manifest } from "./version-store.ts";

type LegacyEntry = Omit<Entry, "patch"> & { readonly patch: LegacyPatch };

const stateKey = (version: string): string => `panel/versions/${version}/state.json`;
const logKey = (version: string): string => `panel/versions/${version}/wal.json`;

/** Converts one version's state and log, and writes both only when the state passes `checkState`. */
async function migrateVersion(lake: Lake, version: string): Promise<string> {
  const stored = await lake.readJson<LegacyState & { readonly seederTags?: unknown }>(stateKey(version));
  if (stored.seederTags !== undefined) return `${version}: already migrated`;

  const state = convertState(stored);
  const problems = checkState(state, SPLIT_DEFAULTS);
  if (problems.length > 0) return `${version}: not written, ${problems.slice(0, 5).join("; ")}`;

  const log = (await lake.exists(logKey(version)))
    ? await lake.readJson<readonly LegacyEntry[]>(logKey(version))
    : [];
  const converted = log.map((entry) => ({ ...entry, patch: convertPatch(entry.patch) }));
  await lake.writeJsonAtomic(logKey(version), converted);
  await lake.writeJsonAtomic(stateKey(version), state);
  return `${version}: ${String(Object.keys(state.seederTags).length)} seeders' tags moved, ${String(converted.length)} log entries rewritten`;
}

async function main(): Promise<void> {
  const lake = createLakeService({ root: ".s3" });
  const manifest = await lake.readJson<Manifest>("panel/manifest.json");

  for (const version of Object.keys(manifest.versions)) console.log(await migrateVersion(lake, version));
}

await main();
