import { requireEnv } from "@util/core/env";

/** Base of the wiki. The trailing slash is stripped so joins stay predictable. */
const wikiUrl = () => requireEnv("POE_WIKI_BASE_URL").replace(/\/$/, "");

/**
 * What one Cargo query needs. `tables` and `fields` are the query; the rest narrow it.
 *
 * `fields` uses Cargo's own `table.column=alias` syntax, and the alias is what comes back
 * as the object key — so the shape of a row is decided here, at the call site, rather
 * than by the wiki's column names.
 */
export type CargoQuery = {
  tables: string;
  fields: string;
  /**
   * How to join them, when `tables` names more than one. Cargo's own tables share
   * `_pageID` — every child table row carries the page id of the row it belongs to —
   * so `mods._pageID=mod_spawn_weights._pageID` is the usual shape.
   */
  joinOn?: string;
  where?: string;
  groupBy?: string;
  orderBy?: string;
  offset?: number;
  limit?: number;
};

/**
 * One page of a Cargo query against the wiki's `Special:CargoExport`.
 *
 * This is a MediaWiki, not GGG: it publishes no rate limits and shares no budget with
 * anything `@poe/ggg` paces, so requests go out unpaced. Callers that page still walk
 * pages one at a time — a wiki is somebody's server, and there is no reason to fan out
 * against it.
 *
 * Rows are asserted to `T`, never validated. Cargo answers a query it cannot run with an
 * empty array rather than an error, so an unexpectedly empty result usually means the
 * `where` clause is wrong, not that nothing matched.
 */
export async function cargoQuery<T>(query: CargoQuery): Promise<readonly T[]> {
  const params = new URLSearchParams({
    title: "Special:CargoExport",
    tables: query.tables,
    fields: query.fields,
    format: "json",
  });

  if (query.joinOn !== undefined) params.set("join_on", query.joinOn);
  if (query.where !== undefined) params.set("where", query.where);
  if (query.groupBy !== undefined) params.set("group_by", query.groupBy);
  if (query.orderBy !== undefined) params.set("order_by", query.orderBy);
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  const url = `${wikiUrl()}/index.php?${params}`;

  const response = await fetch(url, {
    headers: {
      "user-agent": requireEnv("POE_USER_AGENT"),
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`poewiki ${response.status} for ${url}`);
  }

  return (await response.json()) as readonly T[];
}
