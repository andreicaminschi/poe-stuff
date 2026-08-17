import type { Artifacts } from "../../core/artifacts.ts";
import { requireEnv } from "../../core/env.ts";
import type { Filters } from "./domain.ts";

export function loadFilters(filters: Filters, out: Artifacts): Promise<readonly string[]> {
  return Promise.all([
    out.json(filters),
    out.ndjson(filters.groups.flatMap((group) => group.filters)),
    out.meta(requireEnv("POE_FILTERS_URL"), filters.totals),
  ]);
}
