import type { Bag } from "../types.ts";

/** Returns a bag with `remove` taken out, then `add` put in, or undefined when nothing is left: an empty bag is never stored. */
export function patchBag(bag: Bag | undefined, add: readonly string[] = [], remove: readonly string[] = []): Bag | undefined {
  const kept = Object.keys(bag ?? {}).filter((value) => !remove.includes(value));
  const values = [...new Set([...kept, ...add])];

  if (values.length === 0) return undefined;
  return Object.fromEntries(values.map((value) => [value, true] as const));
}
