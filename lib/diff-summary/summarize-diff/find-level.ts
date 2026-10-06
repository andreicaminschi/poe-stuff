import type { Path } from "../types.ts";
import { matchesPrefix } from "./matches-prefix.ts";

/** Finds the deepest config level a path sits at or below, which decides how its change is worded. */
export const findLevel = (patterns: readonly string[], path: Path): string | undefined =>
  [...patterns]
    .sort((left, right) => right.split(".").length - left.split(".").length)
    .find((pattern) => pattern.split(".").length <= path.length && matchesPrefix(pattern, path));
