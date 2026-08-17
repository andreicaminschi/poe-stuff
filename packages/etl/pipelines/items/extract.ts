import { requireEnv } from "../../core/env.ts";
import { fetchJson } from "../../core/http.ts";

export function extractItems(): Promise<unknown> {
  return fetchJson(requireEnv("POE_ITEMS_URL"));
}
