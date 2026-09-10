import { runAction, type ActionResult } from "./yarn.ts";

export const publishCatalog = (repo: string, league: string, hour: number): Promise<ActionResult> =>
  runAction(repo, ["catalog:publish", `--league=${league}`, `--hour=${hour}`]);
