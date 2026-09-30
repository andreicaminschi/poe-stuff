import type { Lake } from "@poe/lake/types";
import { readLog } from "./load-version.ts";
import type { LoadedVersion } from "./panel-api.ts";
import type { Category, Manifest, WalEntry } from "./types.ts";

const MANIFEST_KEY = "admin-panel/versions/manifest.json";

/** Formats the lake key of one file in a version's folder. Low, Sonar 0. */
const formatKey = (version: string, file: string): string => `admin-panel/versions/${version}/${file}`;

/** Reads the game part of a version: `3.29.7` is `3.29`. Low, Sonar 0. */
const readGameVersion = (version: string): string => version.split(".").slice(0, 2).join(".");

/** Writes a version's log first, then its categories, so the log is never behind. Low, Sonar 0. */
async function writeVersionFiles(
  lake: Lake,
  version: string,
  categories: readonly Category[],
  log: readonly WalEntry[],
): Promise<LoadedVersion> {
  await lake.writeJsonAtomic(formatKey(version, "wal.json"), log);
  await lake.writeJsonAtomic(formatKey(version, "categories.json"), { version, categories });

  return { version, state: "draft", categories, log };
}

/**
 * Saves the categories and appends the unsaved entries to the log: over the open version when
 * the manifest says it is a draft, else as a new draft whose parent is the open version and
 * whose log starts with these entries. Returns the version now open. Low, Sonar 2.
 */
export async function saveVersion(
  lake: Lake,
  version: string,
  categories: readonly Category[],
  entries: readonly WalEntry[],
): Promise<LoadedVersion> {
  const manifest = await lake.readJson<Manifest>(MANIFEST_KEY);
  const entry = manifest.versions[version];

  if (entry === undefined) throw new Error(`${MANIFEST_KEY} has no version ${version}.`);

  if (entry.state === "draft") return writeVersionFiles(lake, version, categories, [...(await readLog(lake, version)), ...entries]);

  const draft = `${readGameVersion(version)}.${String(manifest.next)}`;
  const saved = await writeVersionFiles(lake, draft, categories, entries);

  await lake.writeJsonAtomic(MANIFEST_KEY, {
    ...manifest,
    next: manifest.next + 1,
    versions: { ...manifest.versions, [draft]: { state: "draft", parent: version, createdAt: new Date().toISOString() } },
  });

  return saved;
}
