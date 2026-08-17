import { z } from "zod";

/** One catalogue entry: a named trade query belonging to a version. */
export const QuerySpecSchema = z.object({
  queryId: z.string().min(1),
  query: z.unknown(),
  required: z.boolean().default(true),
  pages: z.number().int().positive().max(10).default(3),
});

export const CatalogueSchema = z.array(QuerySpecSchema).min(1);

export const SearchJobSchema = z.object({
  versionId: z.string(),
  queryId: z.string(),
  league: z.string(),
  query: z.unknown(),
  pages: z.number().int().positive().max(10),
  phase: z.enum(["search", "collect"]).default("search"),
});

export const FetchJobSchema = z.object({
  versionId: z.string(),
  queryId: z.string(),
  /** Search id GGG returned; the fetch endpoint needs it as `?query=`. */
  searchId: z.string(),
  /** Carried through to the written line so each row records the result size. */
  total: z.number().int().nonnegative(),
  /** At most ten, the fetch endpoint's cap. One page. */
  hashes: z.array(z.string()).min(1).max(10),
  /** 1-based page number, the cache key suffix under `<searchId>_page<n>`. */
  page: z.number().int().positive(),
});

export type QuerySpec = z.infer<typeof QuerySpecSchema>;
export type SearchJob = z.infer<typeof SearchJobSchema>;
export type FetchJob = z.infer<typeof FetchJobSchema>;

/** Job data comes back off Redis as plain JSON, so it is re-validated on read. */
export const readSearchJob = (data: unknown): SearchJob => SearchJobSchema.parse(data);
export const readFetchJob = (data: unknown): FetchJob => FetchJobSchema.parse(data);
