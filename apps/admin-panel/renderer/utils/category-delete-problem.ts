import type { Draft } from "../../api/taxonomy/types.ts";

export function categoryDeleteProblem(draft: Draft, path: string): string | undefined {
  const [category, subcategory] = path.split("/");
  const rows = Object.values(draft.items).filter(
    (row) =>
      row.classification.category === category &&
      (subcategory === undefined || row.classification.subcategory === subcategory),
  ).length;

  if (rows > 0) return `${rows} row${rows === 1 ? " is" : "s are"} filed here, excluded rows included.`;
  if (subcategory !== undefined) return undefined;

  const subs = Object.keys(draft.categories).filter((other) => other.startsWith(`${path}/`)).length;

  return subs > 0 ? `It has ${subs} subcategor${subs === 1 ? "y" : "ies"}.` : undefined;
}
