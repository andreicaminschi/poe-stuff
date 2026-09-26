import type { Draft, Item } from "../../api/taxonomy/types.ts";
import type { View } from "../types.ts";
import { isFiledIn } from "./is-filed-in.ts";
import { rowInView } from "./row-in-view.ts";

export function rowsIn(draft: Draft, path: string | undefined, view: View): readonly Item[] {
  const inView = Object.values(draft.items).filter((row) => rowInView(row, view));

  return path === undefined ? inView : inView.filter((row) => isFiledIn(row, path));
}
