import type { Artifacts } from "../../core/artifacts.ts";
import { requireEnv } from "../../core/env.ts";
import type { Leagues } from "./domain.ts";

export function loadLeagues(leagues: Leagues, out: Artifacts): Promise<readonly string[]> {
  return Promise.all([
    out.json(leagues),
    out.ndjson(leagues.realms.flatMap((realm) => realm.leagues)),
    out.meta(requireEnv("POE_LEAGUES_URL"), leagues.totals),
  ]);
}
