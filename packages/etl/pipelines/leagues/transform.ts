import type { League, Leagues, Realm } from "./domain.ts";
import type { RawLeague, RawLeagues } from "./raw.ts";

/** The leagues that exist on every realm regardless of the temporary cycle. */
const PERMANENT = new Set(["Standard", "Hardcore", "Ruthless", "Hardcore Ruthless"]);

/**
 * GGG returns one flat row per league *per realm*, so the same league id shows
 * up three times. Grouping by realm makes the duplication structural instead of
 * something every caller has to filter out.
 */
export function transformLeagues(raw: RawLeagues): Leagues {
  const byRealm = new Map<string, League[]>();
  for (const row of raw.result) {
    const league = toLeague(row);
    const leagues = byRealm.get(league.realm);
    if (leagues === undefined) byRealm.set(league.realm, [league]);
    else leagues.push(league);
  }

  const realms: Realm[] = [...byRealm]
    .map(([id, leagues]) => ({ id, count: leagues.length, leagues }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    totals: {
      realms: realms.length,
      leagues: raw.result.length,
      distinctLeagues: new Set(raw.result.map((row) => row.id)).size,
    },
    realms,
  };
}

function toLeague(row: RawLeague): League {
  return {
    id: row.id,
    realm: row.realm,
    text: row.text,
    permanent: PERMANENT.has(row.id),
  };
}
