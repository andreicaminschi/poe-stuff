import type { Path } from "../types.ts";

/** Tells whether a path and a config level agree on every key they share, `*` standing for any key. */
export function matchesPrefix(pattern: string, path: Path): boolean {
  const segments = pattern.split(".");
  const shared = Math.min(segments.length, path.length);

  return segments.slice(0, shared).every((segment, index) => segment === "*" || segment === path[index]);
}

/** Tells whether a path sits exactly at a config level. */
export const matchesPattern = (pattern: string, path: Path): boolean =>
  pattern.split(".").length === path.length && matchesPrefix(pattern, path);
