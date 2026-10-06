import type { Path } from "../types.ts";
import { isRecord } from "./is-record.ts";

/** Reads the value a state holds at a path, or undefined when any key on the way is missing. */
export const readAt = (tree: unknown, path: Path): unknown =>
  path.reduce<unknown>((node, key) => (isRecord(node)
    ? node[key]
    : undefined), tree);
