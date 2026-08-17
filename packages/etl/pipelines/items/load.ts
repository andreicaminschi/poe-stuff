import type { Artifacts } from "../../core/artifacts.ts";
import { requireEnv } from "../../core/env.ts";
import type { Items } from "./domain.ts";

export function loadItems(items: Items, out: Artifacts): Promise<readonly string[]> {
  return Promise.all([
    out.json(items),
    out.ndjson(items.categories.flatMap((category) => category.items)),
    out.meta(requireEnv("POE_ITEMS_URL"), items.totals),
  ]);
}
