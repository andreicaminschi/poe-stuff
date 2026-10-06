import type { Fact, Tree } from "../types.ts";
import { isSame } from "./is-same.ts";
import { readAt } from "./read-at.ts";

/** Words what an earlier step of the request did at one path, or nothing when it left it alone. */
function describeEarlierStep(startValue: unknown, beforeValue: unknown, addVerb: string): string | undefined {
  if (startValue === undefined && beforeValue === undefined) return undefined;
  if (startValue === undefined) return `${addVerb} earlier in this request`;
  if (beforeValue === undefined) return "removed earlier in this request";
  if (isSame(startValue, beforeValue)) return undefined;
  return "changed earlier in this request";
}

/**
 * Marks each fact that touches what an earlier step of the same request already changed, so
 * the Judge sees when work is being undone or redone. It compares the request's start with the
 * state just before this step, at the fact's own path.
 */
export const flagOverwrites = (facts: readonly Fact[], start: Tree, before: Tree): readonly Fact[] =>
  facts.map((fact) => {
    const earlier = describeEarlierStep(readAt(start, fact.path), readAt(before, fact.path), fact.kind === "field"
      ? fact.addVerb
      : "added");

    return earlier === undefined
      ? fact
      : { ...fact, earlier };
  });
