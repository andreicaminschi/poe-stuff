import type { Level } from "../../api/taxonomy/types.ts";
import type { Origins } from "../types.ts";

/** A level and its name, e.g. `category StackableCurrency`. */
export function originText(level: Level, origins: Origins): string {
  const name = origins[level];

  return name === undefined ? level : `${level} ${name}`;
}
