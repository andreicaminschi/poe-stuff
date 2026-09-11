import type { CatalogSource } from "../panel-api.ts";
import { runAction, type ActionResult } from "../util/yarn.ts";

export const buildCatalog = (
  repo: string,
  league: string,
  force: readonly CatalogSource[],
): Promise<ActionResult> =>
  runAction(repo, [
    "catalog",
    `--league=${league}`,
    ...(force.length === 0 ? [] : [`--force=${force.join(",")}`]),
  ]);
