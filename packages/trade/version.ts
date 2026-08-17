import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { z } from "zod";

import { doneQueries, failedQueries } from "./keys.ts";
import { LATEST_FILE, manifestFile, SEARCH_DIR, versionDir } from "./paths.ts";
import { redis } from "./redis.ts";

export const ManifestSchema = z.object({
  versionId: z.string(),
  startedAt: z.string(),
  league: z.string(),
  /** Every query the version is expected to contain. */
  expected: z.array(z.object({ queryId: z.string(), required: z.boolean(), pages: z.number() })),
});

export const LatestSchema = z.object({
  versionId: z.string(),
  completedAt: z.string(),
  queries: z.number(),
  missing: z.array(z.string()),
});

export type Manifest = z.infer<typeof ManifestSchema>;
export type Latest = z.infer<typeof LatestSchema>;

/** Lexicographically sortable and readable in a directory listing. */
export function newVersionId(now = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function writeManifest(manifest: Manifest): Promise<void> {
  await mkdir(versionDir(manifest.versionId), { recursive: true });
  await writeAtomic(manifestFile(manifest.versionId), JSON.stringify(manifest, null, 2));
}

export async function readManifest(versionId: string): Promise<Manifest> {
  return ManifestSchema.parse(JSON.parse(await readFile(manifestFile(versionId), "utf8")));
}

export const markDone = (versionId: string, queryId: string) =>
  redis().sadd(doneQueries(versionId), queryId);

export const markFailed = (versionId: string, queryId: string) =>
  redis().sadd(failedQueries(versionId), queryId);

export type Completion = {
  readonly complete: boolean;
  readonly done: number;
  readonly expected: number;
  /** Expected queries with no data. Blocks completion only when required. */
  readonly missing: readonly string[];
  readonly blocking: readonly string[];
};

/**
 * A version is complete once every *required* query has produced data. Optional
 * ones are recorded as missing so one dead query cannot stall the pointer.
 */
export async function checkCompletion(versionId: string): Promise<Completion> {
  const manifest = await readManifest(versionId);
  const done = new Set(await redis().smembers(doneQueries(versionId)));

  const missing = manifest.expected.filter((q) => !done.has(q.queryId));
  const blocking = missing.filter((q) => q.required).map((q) => q.queryId);

  return {
    complete: blocking.length === 0,
    done: done.size,
    expected: manifest.expected.length,
    missing: missing.map((q) => q.queryId),
    blocking,
  };
}

/**
 * The commit. Until this runs the version is invisible; consumers resolve
 * `latest.json` and never scan the versions directory.
 */
export async function flipLatest(versionId: string, missing: readonly string[]): Promise<Latest> {
  const manifest = await readManifest(versionId);
  const latest: Latest = {
    versionId,
    completedAt: new Date().toISOString(),
    queries: manifest.expected.length - missing.length,
    missing: [...missing],
  };

  await mkdir(SEARCH_DIR, { recursive: true });
  await writeAtomic(LATEST_FILE, JSON.stringify(latest, null, 2));
  return latest;
}

export async function readLatest(): Promise<Latest | undefined> {
  try {
    return LatestSchema.parse(JSON.parse(await readFile(LATEST_FILE, "utf8")));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) return undefined;
    throw error;
  }
}

/** Write then rename, so a reader never sees a half-written pointer. */
async function writeAtomic(path: string, contents: string): Promise<void> {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${contents}\n`, "utf8");
  await rename(tmp, path);
}
