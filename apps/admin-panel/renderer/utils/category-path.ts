import type { CategoryTarget } from "../types.ts";

export function categoryPath(target: CategoryTarget, parent: string, slug: string): string {
  if (target.kind === "edit") return target.path;
  if (target.kind === "new-subcategory") return `${parent}/${slug}`;

  return slug;
}
