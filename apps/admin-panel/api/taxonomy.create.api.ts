import { runAction, type ActionResult } from "./yarn.ts";

export const createVersion = (repo: string, parent: string): Promise<ActionResult> =>
  runAction(repo, ["taxonomy:create", `--parent=${parent}`]);
