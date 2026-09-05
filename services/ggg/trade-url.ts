import { DEFAULT_TRADE_SITE_URL, trimUrl } from "./config.ts";

/** What a trade-site search names: a unique by `name` and `type`, a base by `type` alone. */
export type TradeSearch = {
  readonly league: string;
  readonly name?: string;
  readonly type?: string;
  /** Only foulborn items, or only plain ones. Absent asks for both. */
  readonly foulborn?: boolean;
  /** Only corrupted items, or only uncorrupted ones. Absent asks for both. */
  readonly corrupted?: boolean;
  /** Base of the trade site, without a trailing slash. Defaults to the live site. */
  readonly siteUrl?: string;
};

/**
 * The URL a person opens to see the listings for one item.
 *
 * The site reads a search out of `q`, the same JSON the API's search endpoint takes, so
 * a unique is `name` plus `type` and a base is `type` alone. A foulborn unique keeps its
 * plain name — `Headhunter`, never `Foulborn Headhunter` — and is asked for through the
 * `mutated` filter, which is what GGG calls foulborn in the filter list.
 *
 * The search always asks for `securable`, the status GGG calls Instant Buyout, because a
 * listing nobody can buy without a whisper is not a price a person can act on. Pure: a URL
 * is built, nothing is fetched, and no rate limit applies until a browser opens it.
 */
export function tradeSearchUrl(search: TradeSearch): string {
  const misc = {
    ...(search.foulborn === undefined ? {} : { mutated: { option: String(search.foulborn) } }),
    ...(search.corrupted === undefined
      ? {}
      : { corrupted: { option: String(search.corrupted) } }),
  };

  const query = {
    query: {
      status: { option: "securable" },
      ...(search.name === undefined ? {} : { name: search.name }),
      ...(search.type === undefined ? {} : { type: search.type }),
      ...(Object.keys(misc).length === 0
        ? {}
        : { filters: { misc_filters: { filters: misc } } }),
    },
  };

  const base = trimUrl(search.siteUrl ?? DEFAULT_TRADE_SITE_URL);

  return `${base}/${encodeURIComponent(search.league)}?q=${encodeURIComponent(JSON.stringify(query))}`;
}
