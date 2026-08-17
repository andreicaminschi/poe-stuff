import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Walks up for the lockfile rather than counting `..` segments, so the package
 * can move within the monorepo without silently writing artifacts to the wrong
 * place. Resolved from this file, not cwd, so tools work from any directory.
 */
function findRepoRoot(from: string): string {
  let dir = from;
  for (;;) {
    if (existsSync(join(dir, "yarn.lock"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No yarn.lock found above ${from}`);
    dir = parent;
  }
}

/** Monorepo root — `data/` is shared across packages, not owned by this one. */
export const ROOT = findRepoRoot(import.meta.dirname);

/** Landing zone for untransformed extract output. Gitignored. */
export const RAW_DIR = join(ROOT, "data", "raw");
