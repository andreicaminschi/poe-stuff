import type { Bag } from "@poe/panel-state/types";

export type BagDiff = { readonly add: readonly string[]; readonly remove: readonly string[] };

/** What turns the stored bag into the drafted values. */
export function diffBag(stored: Bag | undefined, draft: readonly string[]): BagDiff {
  const storedValues = Object.keys(stored ?? {});
  return {
    add: draft.filter((value) => !storedValues.includes(value)),
    remove: storedValues.filter((value) => !draft.includes(value)),
  };
}
