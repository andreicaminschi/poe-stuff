import type { Artifacts } from "../../core/artifacts.ts";
import { requireEnv } from "../../core/env.ts";
import type { StaticData } from "./domain.ts";

export function loadStatic(data: StaticData, out: Artifacts): Promise<readonly string[]> {
  return Promise.all([
    out.json(data),
    out.ndjson(data.groups.flatMap((group) => group.items)),
    out.meta(requireEnv("POE_STATIC_URL"), data.totals),
  ]);
}
