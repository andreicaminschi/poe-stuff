import type { Path } from "../types.ts";
import { isRecord } from "./is-record.ts";
import { matchesPrefix } from "./matches-prefix.ts";

export type Match = { readonly path: Path; readonly value: unknown };

/**
 * Lists every entry at one config level inside a subtree, so a removed category still yields
 * the seeders it held.
 *
 * @example
 * listMatches(["categories", "Rings"], { seeders: { Amulets: {}, Belts: {} } }, "categories.*.seeders.*");
 * // → [{ path: ["categories", "Rings", "seeders", "Amulets"], value: {} }, { path: [… "Belts"], value: {} }]
 */
export function listMatches(path: Path, value: unknown, pattern: string): readonly Match[] {
  const depth = pattern.split(".").length;

  if (path.length > depth || !matchesPrefix(pattern, path)) return [];
  if (path.length === depth) return [{ path, value }];
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => listMatches([...path, key], child, pattern));
}
