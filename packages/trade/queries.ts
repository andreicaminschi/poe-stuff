import { readFile } from "node:fs/promises";
import { cacheKey } from "@util/core/cache-key";
import { requireEnv } from "@util/core/env";

/** One entry of the query file. `body` is what goes to `POST /search/:league`. */
export type Query = {
  id: string;
  name: string;
  league: string;
  active: boolean;
  inactiveReason?: string | null;
  body: unknown;
};

export type QueryFile = {
  /** Of the file as written, so a cohort can tell whether it has been edited under it. */
  digest: string;
  queries: readonly Query[];
};

/**
 * Queries are authored by hand, so they live in a file rather than a table. Every worker
 * and every command reads the same one, named by `QUERIES_FILE`.
 */
export async function loadQueries(): Promise<QueryFile> {
  const text = await readFile(requireEnv("QUERIES_FILE"), "utf8");

  return {
    digest: cacheKey("queries", text),
    queries: JSON.parse(text) as Query[],
  };
}

/** What a new cohort is built from. */
export const activeQueries = (file: QueryFile): Query[] =>
  file.queries.filter((query) => query.active);

/**
 * A cohort holds job rows for queries that were active when it started, so a query it
 * names has to still be in the file — a job that cannot find its query is a broken run,
 * not a job to quietly skip.
 */
export function findQuery(file: QueryFile, queryId: string): Query {
  const query = file.queries.find((entry) => entry.id === queryId);
  if (query === undefined) {
    throw new Error(`no query ${queryId} in the query file`);
  }

  return query;
}
