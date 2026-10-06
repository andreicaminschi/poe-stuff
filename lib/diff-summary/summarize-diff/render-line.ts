import type { Group, Level, Path, SummaryConfig } from "../types.ts";

/** Reads the name of the entity a collection belongs to, or undefined at the top level. */
const readParentName = (collection: Path): string | undefined => collection.at(-2);

/** Writes the trailing note for a change an earlier step of the request already touched. */
const describeEarlier = (group: Group): string => (group.earlier === undefined
  ? ""
  : ` (${group.earlier})`);

/** Names the siblings a bulk change missed, or the few it reached when those are fewer. */
function describeCoverage(group: Group): string {
  const missing = group.siblings.filter((name) => !group.names.includes(name));

  if (missing.length === 0) return "";
  if (missing.length <= group.names.length) return ` (not: ${missing.join(", ")})`;
  return ` (only: ${group.names.join(", ")})`;
}

/** Counts a bulk change against everything the collection held. */
const describeCount = (group: Group, level: Level): string => `${group.names.length}/${group.siblings.length} ${level.many}`;

/** Names one entity, with its parent when its name alone could be ambiguous. */
function describeEntity(level: Level, name: string, collection: Path): string {
  const parent = readParentName(collection);

  if (level.unique === true || parent === undefined) return `${level.one} "${name}"`;
  return `${level.one} "${name}" in ${parent}`;
}

/** Writes the place phrase for a collection, empty at the top level. */
function describePlace(preposition: string, collection: Path): string {
  const parent = readParentName(collection);

  return parent === undefined
    ? ""
    : ` ${preposition} ${parent}`;
}

/** Writes a field change: named for one entity, counted for several. */
function renderField(group: Group, level: Level | undefined): string {
  const text = group.text ?? "";

  if (level === undefined) return `${text}${describeEarlier(group)}`;
  if (group.names.length === 1) return `${describeEntity(level, group.names[0] ?? "", group.collection)}: ${text}${describeEarlier(group)}`;
  return `${describeCount(group, level)}${describePlace("in", group.collection)}: ${text}${describeCoverage(group)}${describeEarlier(group)}`;
}

/** Writes new entities: the one by name, several as a count and a name list. */
function renderAdded(group: Group, level: Level): string {
  if (group.names.length === 1) return `${level.one} "${group.names[0] ?? ""}" added${describePlace("in", group.collection)}${describeEarlier(group)}`;
  return `${group.names.length} ${level.many} added${describePlace("in", group.collection)}: ${group.names.join(", ")}${describeEarlier(group)}`;
}

/** Writes removed entities: the one by name, several counted against the collection. */
function renderRemoved(group: Group, level: Level): string {
  if (group.names.length === 1) return `${level.one} "${group.names[0] ?? ""}" removed${describePlace("from", group.collection)}${describeEarlier(group)}`;
  return `${describeCount(group, level)} removed${describePlace("from", group.collection)}${describeCoverage(group)}${describeEarlier(group)}`;
}

/** Writes moved entities, from one parent to another. */
function renderMoved(group: Group, level: Level): string {
  const route = `moved from ${readParentName(group.collection) ?? "top level"} to ${readParentName(group.toCollection ?? []) ?? "top level"}`;

  if (group.names.length === 1) return `${level.one} "${group.names[0] ?? ""}" ${route}${describeEarlier(group)}`;
  return `${describeCount(group, level)} ${route}${describeCoverage(group)}${describeEarlier(group)}`;
}

/**
 * Writes one group as one plain sentence in the config's words: a lone entity by name, a bulk
 * change as a count with its exceptions.
 *
 * @example
 * renderLine({ kind: "field", pattern: "categories.*.seeders.*", collection: ["categories", "Bases", "seeders"], names: ["Belts", "Rings"], siblings: ["Amulets", "Belts", "Rings"], text: "tag chase added" }, config);
 * // → "2/3 seeders in Bases: tag chase added (not: Amulets)"
 */
export function renderLine(group: Group, config: SummaryConfig): string {
  const level = group.pattern === undefined
    ? undefined
    : config.levels[group.pattern];

  if (group.kind === "field") return renderField(group, level);
  if (level === undefined) return group.text ?? "";
  if (group.kind === "added") return renderAdded(group, level);
  if (group.kind === "removed") return renderRemoved(group, level);
  if (group.kind === "renamed") return `${describeEntity(level, group.names[0] ?? "", group.collection)} renamed to "${group.toName ?? ""}"${describeEarlier(group)}`;
  return renderMoved(group, level);
}
