import type { CategoryNode, CategoryTarget } from "../types.ts";

export function initialParent(
  target: CategoryTarget,
  selection: string | undefined,
  tops: readonly Pick<CategoryNode, "path">[],
): string {
  if (target.kind === "edit") return target.path.split("/")[0] ?? "";

  const current = selection?.split("/")[0];
  if (current !== undefined && tops.some((node) => node.path === current)) return current;

  return tops[0]?.path ?? "";
}
