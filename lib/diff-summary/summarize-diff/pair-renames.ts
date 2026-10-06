import type { EntityFact, Fact, RenameFact } from "../types.ts";
import { isSame } from "./is-same.ts";

type Rename = { readonly removed: EntityFact; readonly added: EntityFact };

/** Tells whether two entities sit in the same collection. */
const shareCollection = (left: EntityFact, right: EntityFact): boolean =>
  JSON.stringify(left.entity.slice(0, -1)) === JSON.stringify(right.entity.slice(0, -1));

/**
 * Turns a removal and an addition with identical contents in the same collection into one
 * rename. It runs before moves are paired, so a renamed category does not read as its seeders
 * moving. Each addition pairs with at most one removal.
 */
export function pairRenames(facts: readonly Fact[]): readonly Fact[] {
  const removed = facts.filter((fact): fact is EntityFact => fact.kind === "removed");
  const added = facts.filter((fact): fact is EntityFact => fact.kind === "added");
  const renames = removed.reduce<readonly Rename[]>((paired, gone) => {
    const match = added.find((fact) => fact.pattern === gone.pattern
      && shareCollection(fact, gone)
      && isSame(fact.value, gone.value)
      && !paired.some((rename) => rename.added === fact));
    return match === undefined
      ? paired
      : [...paired, { removed: gone, added: match }];
  }, []);
  const paired = new Set<Fact>(renames.flatMap((rename) => [rename.removed, rename.added]));

  return [
    ...facts.filter((fact) => !paired.has(fact)),
    ...renames.map(({ removed: gone, added: made }): RenameFact => ({ kind: "renamed", pattern: gone.pattern, from: gone.entity, to: made.entity, path: gone.entity })),
  ];
}
