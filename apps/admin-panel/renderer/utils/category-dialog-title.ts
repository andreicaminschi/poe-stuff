import type { CategoryTarget } from "../types.ts";

export function categoryDialogTitle(target: CategoryTarget, recorded: boolean): string {
  if (target.kind === "new-category") return "New category";
  if (target.kind === "new-subcategory") return "New subcategory";
  if (recorded) return `Edit ${target.path}`;

  return `Author ${target.path}`;
}
