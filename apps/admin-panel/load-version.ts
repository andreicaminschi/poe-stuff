import type { Lake } from "@poe/lake/types";
import type { LoadedVersion } from "./panel-api.ts";
import type { CategoriesFile, Manifest, WalEntry } from "./types.ts";

const MANIFEST_KEY = "admin-panel/versions/manifest.json";

/** Orders versions like `3.29.10` after `3.29.9`. Low, Sonar 1. */
function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  const differing = left.findIndex((part, at) => part !== right[at]);

  return differing === -1
    ? 0
    : (left[differing] ?? 0) - (right[differing] ?? 0);
}

/** Reads the newest version in the manifest, draft or published. Low, Sonar 1. */
export async function loadVersion(lake: Lake): Promise<LoadedVersion> {
  const manifest = await lake.readJson<Manifest>(MANIFEST_KEY);
  const version = Object.keys(manifest.versions).sort(compareVersions).at(-1);

  if (version === undefined) throw new Error(`${MANIFEST_KEY} lists no versions. Run yarn admin-panel:migrate.`);

  const file = await lake.readJson<CategoriesFile>(`admin-panel/versions/${version}/categories.json`);
  const state = manifest.versions[version]?.state ?? "draft";

  return { version, state, categories: file.categories, log: await readLog(lake, version) };
}

/** Reads a version's write-ahead log, empty when it has none. Low, Sonar 1. */
export async function readLog(lake: Lake, version: string): Promise<readonly WalEntry[]> {
  const key = `admin-panel/versions/${version}/wal.json`;

  return (await lake.exists(key))
    ? lake.readJson<readonly WalEntry[]>(key)
    : [];
}
