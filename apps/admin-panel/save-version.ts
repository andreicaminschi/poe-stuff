import type { Lake } from "@poe/lake/types";
import type { LoadedVersion } from "./panel-api.ts";
import type { Category, Manifest } from "./types.ts";

const MANIFEST_KEY = "admin-panel/versions/manifest.json";

/** Formats the lake key of one version's categories file. Low, Sonar 0. */
const formatCategoriesKey = (version: string): string => `admin-panel/versions/${version}/categories.json`;

/** Reads the game part of a version: `3.29.7` is `3.29`. Low, Sonar 0. */
const readGameVersion = (version: string): string => version.split(".").slice(0, 2).join(".");

/**
 * Saves the categories over the open version when the manifest says it is a draft, else as a
 * new draft whose parent is the open version. Returns the version now open. Low, Sonar 2.
 */
export async function saveVersion(lake: Lake, version: string, categories: readonly Category[]): Promise<LoadedVersion> {
  const manifest = await lake.readJson<Manifest>(MANIFEST_KEY);
  const entry = manifest.versions[version];

  if (entry === undefined) throw new Error(`${MANIFEST_KEY} has no version ${version}.`);

  if (entry.state === "draft") {
    await lake.writeJsonAtomic(formatCategoriesKey(version), { version, categories });
    return { version, state: "draft", categories };
  }

  const draft = `${readGameVersion(version)}.${String(manifest.next)}`;

  await lake.writeJsonAtomic(formatCategoriesKey(draft), { version: draft, categories });
  await lake.writeJsonAtomic(MANIFEST_KEY, {
    ...manifest,
    next: manifest.next + 1,
    versions: { ...manifest.versions, [draft]: { state: "draft", parent: version, createdAt: new Date().toISOString() } },
  });

  return { version: draft, state: "draft", categories };
}
