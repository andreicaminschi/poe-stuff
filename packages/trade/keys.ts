import { cacheKey } from "@util/core/cache-key";

/**
 * A job key is both the BullMQ job id and the primary key of its ledger row. Built from
 * the cohort, the query and — for a page — its position, never from the search id GGG
 * handed back: two searches of the same query have to produce the same page keys, or
 * neither can reject the other.
 */
export const searchKey = (cohortId: string, queryId: string) =>
  cacheKey("search", cohortId, queryId);

export const pageKey = (cohortId: string, queryId: string, page: number) =>
  cacheKey("page", cohortId, queryId, String(page));

/** Hive partition naming, so a query for one cohort reads only that prefix. */
export const pageObjectKey = (
  cohortId: string,
  queryId: string,
  page: number,
) => `pages/cohort=${cohortId}/${queryId}-${page}.ndjson`;

/** What a reader with no database needs in order to find the current cohort. */
export const LATEST_KEY = "latest.json";
