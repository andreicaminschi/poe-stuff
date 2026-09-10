import type { Draft } from "../../api/taxonomy.types.ts";
import type { CategoryNode, CategoryTree } from "../types.ts";
import { pathOf } from "./path-of.ts";
import { titleCase } from "./title-case.ts";

export function categoryTree(draft: Draft): CategoryTree {
  const counts = new Map<string, number>();
  const bump = (path: string) => counts.set(path, (counts.get(path) ?? 0) + 1);

  for (const row of Object.values(draft.items)) {
    bump(row.classification.category);
    if (row.classification.subcategory !== null) bump(pathOf(row.classification));
  }

  const paths = [...new Set([...Object.keys(draft.categories), ...counts.keys()])];
  const tops = [...new Set(paths.map((path) => path.split("/")[0] ?? path))];

  const node = (path: string, children: readonly CategoryNode[] = []): CategoryNode => ({
    path,
    label: draft.categories[path]?.name ?? titleCase(path.split("/").at(-1) ?? path),
    count: counts.get(path) ?? 0,
    authored: draft.categories[path] !== undefined,
    children,
  });

  const byLabel = (a: CategoryNode, b: CategoryNode) => a.label.localeCompare(b.label);

  const nodes = tops
    .map((top) =>
      node(
        top,
        paths
          .filter((path) => path.startsWith(`${top}/`))
          .map((path) => node(path))
          .sort(byLabel),
      ),
    )
    .sort(byLabel);

  const excluded = nodes.find((candidate) => candidate.path === "excluded");

  return {
    nodes: nodes.filter((candidate) => candidate.path !== "excluded"),
    ...(excluded === undefined ? {} : { excluded }),
  };
}
