import { runAction, type ActionResult } from "./yarn.ts";

export const publishVersion = (repo: string, id: string): Promise<ActionResult> =>
  runAction(repo, ["taxonomy:publish", id]);
