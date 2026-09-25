import type { UnfilteredRow } from "./types.ts";

export type UnfilteredGroup = {
  readonly path: string;
  readonly count: number;
  readonly rows: readonly UnfilteredRow[];
};

/** Unfiltered rows grouped by category path, the most samples first. */
export function groupUnfiltered(rows: readonly UnfilteredRow[]): readonly UnfilteredGroup[] {
  const groups = new Map<string, UnfilteredRow[]>();
  for (const row of rows) {
    const path = row.subcategory === null ? row.category : `${row.category}/${row.subcategory}`;
    groups.set(path, [...(groups.get(path) ?? []), row]);
  }

  return [...groups]
    .map(([path, members]) => ({
      path,
      count: members.reduce((sum, row) => sum + row.samples.length, 0),
      rows: [...members].sort((a, b) => b.samples.length - a.samples.length),
    }))
    .sort((a, b) => b.count - a.count);
}
