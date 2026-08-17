import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, "yarn.lock"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No yarn.lock found above ${from}`);
    dir = parent;
  }
}

export const ROOT = findRepoRoot(import.meta.dirname);

/** Bucket root. Local stand-in for object storage; swap this one constant later. */
export const SEARCH_DIR = join(ROOT, "data", "search");

export const VERSIONS_DIR = join(SEARCH_DIR, "versions");

/** Consumers resolve this and nothing else. */
export const LATEST_FILE = join(SEARCH_DIR, "latest.json");

export const versionDir = (versionId: string) => join(VERSIONS_DIR, versionId);

export const manifestFile = (versionId: string) => join(versionDir(versionId), "_manifest.json");

export const queryFile = (versionId: string, queryId: string) =>
  join(versionDir(versionId), `${queryId}.ndjson`);
