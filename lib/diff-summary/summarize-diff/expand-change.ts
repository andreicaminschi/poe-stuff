import type { Change } from "../types.ts";
import { isRecord } from "./is-record.ts";
import { matchesPattern, matchesPrefix } from "./matches-prefix.ts";

/** Builds the change one child of a created or removed container went through. */
const buildChildChange = (change: Change, key: string, child: unknown): Change => (change.type === "REMOVE"
  ? { type: "REMOVE", path: [...change.path, key], oldValue: child }
  : { type: "CREATE", path: [...change.path, key], value: child });

/**
 * Splits a created or removed container into one change per child, until each sits at a config
 * level. A seeder's first tag then reads as that tag, not as a new `tags` map.
 *
 * @example
 * expandChange({ type: "CREATE", path: ["categories", "Bases", "seeders", "Rings", "tags"], value: { chase: true } }, patterns);
 * // → [{ type: "CREATE", path: [… "tags", "chase"], value: true }]
 */
export function expandChange(change: Change, patterns: readonly string[]): readonly Change[] {
  const payload = change.type === "REMOVE"
    ? change.oldValue
    : change.value;

  if (patterns.some((pattern) => matchesPattern(pattern, change.path))) return [change];
  if (change.type === "CHANGE" || !isRecord(payload)) return [change];
  if (!patterns.some((pattern) => pattern.split(".").length > change.path.length && matchesPrefix(pattern, change.path))) return [change];
  return Object.entries(payload).flatMap(([key, child]) => expandChange(buildChildChange(change, key, child), patterns));
}
