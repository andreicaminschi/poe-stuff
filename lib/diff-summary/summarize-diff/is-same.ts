import diff from "microdiff";
import { isRecord } from "./is-record.ts";
import { pruneShared } from "./prune-shared.ts";

/** Tells whether two state values hold the same content. The same object is the same content without a walk. */
export function isSame(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!isRecord(left) || !isRecord(right)) return Object.is(left, right);
  const pruned = pruneShared(left, right);
  return diff(pruned.before, pruned.after).length === 0;
}
