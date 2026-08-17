import type { Artifacts } from "../../core/artifacts.ts";
import { requireEnv } from "../../core/env.ts";
import type { Stats } from "./domain.ts";

export function loadStats(stats: Stats, out: Artifacts): Promise<readonly string[]> {
  return Promise.all([
    out.json(stats),
    out.ndjson(stats.groups.flatMap((group) => group.stats)),
    out.meta(requireEnv("POE_STATS_URL"), stats.totals),
  ]);
}
