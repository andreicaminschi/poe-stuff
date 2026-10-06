import type { Group } from "../types.ts";
import { compareText } from "./compare-text.ts";

const KIND_ORDER: Readonly<Record<Group["kind"], number>> = { removed: 0, renamed: 1, moved: 2, added: 3, field: 4 };

/** Puts groups in one fixed order, so the same step always reads the same: removals, renames, moves, additions, then field edits. */
export const sortGroups = (groups: readonly Group[]): readonly Group[] =>
  [...groups].sort((left, right) => KIND_ORDER[left.kind] - KIND_ORDER[right.kind]
    || compareText(left.collection.join("/"), right.collection.join("/"))
    || compareText(left.text ?? "", right.text ?? "")
    || compareText(left.names.join(","), right.names.join(",")));
