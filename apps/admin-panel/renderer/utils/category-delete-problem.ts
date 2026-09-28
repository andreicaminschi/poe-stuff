import type { Draft } from "../../api/taxonomy/types.ts";
import { isFiledIn } from "./is-filed-in.ts";

export function categoryDeleteProblem(draft: Draft, path: string): string | undefined {
  const rows = Object.values(draft.items).filter((row) => isFiledIn(row, path)).length;

  if (rows > 0) return `${rows} row${rows === 1
    ? " is"
    : "s are"} filed here, excluded rows included.`;
  if (path.includes("/")) return undefined;

  const subs = Object.keys(draft.categories).filter((other) => other.startsWith(`${path}/`)).length;

  return subs > 0
    ? `It has ${subs} subcategor${subs === 1
      ? "y"
      : "ies"}.`
    : undefined;
}
