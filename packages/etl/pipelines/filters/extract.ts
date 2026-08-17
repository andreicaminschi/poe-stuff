import { requireEnv } from "../../core/env.ts";
import { fetchJson } from "../../core/http.ts";

export function extractFilters(): Promise<unknown> {
  return fetchJson(requireEnv("POE_FILTERS_URL"));
}
