import { runAction, type ActionResult } from "../util/yarn.ts";

export const promoteVersion = (repo: string, id: string): Promise<ActionResult> =>
  runAction(repo, ["taxonomy:promote", id]);
