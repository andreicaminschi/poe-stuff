import type { Change, Fact, FieldFact, Level, SummaryConfig } from "../types.ts";
import { expandChange } from "./expand-change.ts";
import { findLevel } from "./find-level.ts";
import { formatValue } from "./format-values.ts";
import { isRecord } from "./is-record.ts";
import { matchesPrefix } from "./matches-prefix.ts";

type ValueNames = SummaryConfig["valueNames"];

/** Lists the config levels that hold deeper levels: the entities, as opposed to their values. */
const listEntityPatterns = (patterns: readonly string[]): readonly string[] =>
  patterns.filter((pattern) => patterns.some((other) => other.split(".").length > pattern.split(".").length && matchesPrefix(other, pattern.split("."))));

/** Words an edit to a field that holds one value or one set of values. */
function describeFieldEdit(label: string, change: Change, valueNames: ValueNames): string {
  if (change.type === "CREATE") return `${label} set to ${formatValue(change.value, change.path, valueNames)}`;
  if (change.type === "REMOVE") return `${label} removed`;
  return `${label} changed from ${formatValue(change.oldValue, change.path, valueNames)} to ${formatValue(change.value, change.path, valueNames)}`;
}

/** Words an edit to one member of a bag, such as one tag. */
function describeMemberEdit(label: string, change: Change): string {
  if (change.type === "CREATE") return `${label} added`;
  if (change.type === "REMOVE") return `${label} removed`;
  return `${label} changed from ${formatValue(change.oldValue, change.path)} to ${formatValue(change.value, change.path)}`;
}

/** Words an edit to one value inside a named set, such as one rarity of a condition. */
function describeInnerEdit(value: string, label: string, change: Change): string {
  if (change.type === "CREATE") return `${value} added to ${label}`;
  if (change.type === "REMOVE") return `${value} removed from ${label}`;
  return `${value} in ${label} changed from ${formatValue(change.oldValue, change.path)} to ${formatValue(change.value, change.path)}`;
}

/** Turns a change at or below an entity level into an added, removed or field fact. */
function describeEntityChange(change: Change, pattern: string, valueNames: ValueNames): Fact {
  const depth = pattern.split(".").length;
  const field = change.path.slice(depth).join(".");

  if (field === "" && change.type === "CREATE") return { kind: "added", pattern, entity: change.path, value: change.value, path: change.path };
  if (field === "" && change.type === "REMOVE") return { kind: "removed", pattern, entity: change.path, value: change.oldValue, path: change.path };
  if (field === "") return { kind: "field", pattern, owner: change.path, text: "replaced", addVerb: "set", path: change.path };
  return { kind: "field", pattern, owner: change.path.slice(0, depth), text: describeFieldEdit(field, change, valueNames), addVerb: "set", path: change.path };
}

/**
 * Turns a change at or below a value level into a field fact on the entity that owns it: a
 * member of a bag, a whole named set, or one value inside a named set.
 *
 * @example
 * describeValueChange({ type: "CREATE", path: ["categories", "Bases", "seeders", "Rings", "conditions", "Rarity", "Unique"], value: true }, "categories.*.seeders.*.conditions.*", { one: "condition", many: "conditions" }, "categories.*.seeders.*", undefined);
 * // → { kind: "field", owner: ["categories", "Bases", "seeders", "Rings"], text: "Unique added to condition Rarity", … }
 */
function describeValueChange(change: Change, pattern: string, level: Level, ownerPattern: string | undefined, valueNames: ValueNames): FieldFact {
  const depth = pattern.split(".").length;
  const owner = ownerPattern === undefined
    ? []
    : change.path.slice(0, ownerPattern.split(".").length);
  const label = `${level.one} ${change.path[depth - 1] ?? ""}`;
  const inner = change.path.slice(depth).join(".");
  const payload = change.type === "REMOVE"
    ? change.oldValue
    : change.value;
  const fact = { kind: "field", pattern: ownerPattern, owner, path: change.path } as const;

  if (inner === "" && isRecord(payload)) return { ...fact, text: describeFieldEdit(label, change, valueNames), addVerb: "set" };
  if (inner === "") return { ...fact, text: describeMemberEdit(label, change), addVerb: "added" };
  return { ...fact, text: describeInnerEdit(inner, label, change), addVerb: "added" };
}

/**
 * Turns raw diff changes into facts worded for the config's levels. Containers are split into
 * their children first, and changes outside every config level are dropped, which is how
 * bookkeeping never reaches a summary.
 */
export function listFacts(changes: readonly Change[], config: SummaryConfig): readonly Fact[] {
  const patterns = Object.keys(config.levels);
  const entityPatterns = listEntityPatterns(patterns);

  return changes.flatMap((change) => expandChange(change, patterns)).flatMap((change) => {
    const pattern = findLevel(patterns, change.path);
    const level = pattern === undefined
      ? undefined
      : config.levels[pattern];

    if (pattern === undefined || level === undefined) return [];
    if (entityPatterns.includes(pattern)) return [describeEntityChange(change, pattern, config.valueNames)];
    return [describeValueChange(change, pattern, level, findLevel(entityPatterns, change.path), config.valueNames)];
  });
}
