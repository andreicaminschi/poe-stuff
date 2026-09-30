import type { Lake } from "@poe/lake/types";
import type { Category, Manifest } from "../types.ts";

const MANIFEST_KEY = "admin-panel/versions/manifest.json";
const FIRST_VERSION = "3.29.1";

/** Formats the lake key of one version's categories file. Low, Sonar 0. */
const formatCategoriesKey = (version: string): string => `admin-panel/versions/${version}/categories.json`;

/** Reads the game part of a version: `3.29.7` is `3.29`. Low, Sonar 0. */
const readGameVersion = (version: string): string => version.split(".").slice(0, 2).join(".");

/** Writes the first version of an empty store, published and promoted. Low, Sonar 0. */
async function writeFirstVersion(lake: Lake, categories: readonly Category[], now: string): Promise<string> {
  const file = { version: FIRST_VERSION, categories };
  const manifest: Manifest = {
    next: 2,
    promoted: FIRST_VERSION,
    versions: { [FIRST_VERSION]: { state: "published", createdAt: now, publishedAt: now } },
  };

  await lake.writeJsonAtomic(formatCategoriesKey(FIRST_VERSION), file);
  await lake.writeJsonAtomic(formatCategoriesKey("latest"), file);
  await lake.writeJsonAtomic(MANIFEST_KEY, manifest);

  return FIRST_VERSION;
}

/**
 * Writes a draft version whose parent is the promoted one, so every later migration leaves the
 * promoted version alone until someone publishes the draft. Low, Sonar 1.
 */
async function writeDraftVersion(
  lake: Lake,
  manifest: Manifest,
  categories: readonly Category[],
  now: string,
): Promise<string> {
  const parent = manifest.promoted;

  if (parent === undefined) throw new Error(`${MANIFEST_KEY} has no promoted version to start from.`);

  const version = `${readGameVersion(parent)}.${String(manifest.next)}`;

  await lake.writeJsonAtomic(formatCategoriesKey(version), { version, categories });
  await lake.writeJsonAtomic(MANIFEST_KEY, {
    ...manifest,
    next: manifest.next + 1,
    versions: { ...manifest.versions, [version]: { state: "draft", parent, createdAt: now } },
  });

  return version;
}

/** Writes the categories as a new admin-panel version and returns its number. Low, Sonar 1. */
export async function writeVersion(lake: Lake, categories: readonly Category[]): Promise<string> {
  const now = new Date().toISOString();

  return (await lake.exists(MANIFEST_KEY))
    ? writeDraftVersion(lake, await lake.readJson<Manifest>(MANIFEST_KEY), categories, now)
    : writeFirstVersion(lake, categories, now);
}
