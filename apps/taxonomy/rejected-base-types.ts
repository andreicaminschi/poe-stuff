import { readFileSync } from "node:fs";

const FILE = new URL("./rejected-base-types.json", import.meta.url);

/**
 * Every seed name the game client refuses as a `BaseType`, read from the git-tracked
 * `rejected-base-types.json`. Keyed by the name, valued by the metadata id and why.
 *
 * The only evidence is the client itself: a filter holding the name fails to load. So the
 * file is filled by hand, one name per failed load, and never generated.
 */
export function readRejectedBaseTypes(): ReadonlySet<string> {
  const value: unknown = JSON.parse(readFileSync(FILE, "utf8"));

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("rejected-base-types.json is not an object");
  }

  return new Set(Object.keys(value));
}
