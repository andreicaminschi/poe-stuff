import { appendFile, mkdir } from "node:fs/promises";

import { queryFile, versionDir } from "./paths.ts";

/**
 * A written line: thin envelope plus GGG's row verbatim. Nothing is normalised
 * here — transforming is the derived ETL's job, and keeping the payload raw
 * means a transform bug costs a re-read instead of a re-crawl.
 */
export type RawLine = {
  readonly versionId: string;
  readonly queryId: string;
  readonly searchId: string;
  readonly fetchedAt: string;
  readonly total: number;
  readonly row: unknown;
};

export async function appendRows(
  versionId: string,
  queryId: string,
  searchId: string,
  total: number,
  rows: readonly unknown[],
): Promise<number> {
  if (rows.length === 0) return 0;

  await mkdir(versionDir(versionId), { recursive: true });

  const fetchedAt = new Date().toISOString();
  const lines = rows.map((row) => {
    const line: RawLine = { versionId, queryId, searchId, fetchedAt, total, row };
    return `${JSON.stringify(line)}\n`;
  });

  // Single sequential worker per queue, so plain append is safe. Sharding
  // writers across processes would need one file per fetch chunk instead.
  await appendFile(queryFile(versionId, queryId), lines.join(""), "utf8");
  return lines.length;
}
