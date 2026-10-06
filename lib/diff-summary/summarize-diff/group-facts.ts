import type { Fact, Group, Path, Tree } from "../types.ts";
import { compareText } from "./compare-text.ts";
import { isRecord } from "./is-record.ts";
import { readAt } from "./read-at.ts";

type Member = {
  readonly key: string;
  readonly name: string;
  readonly group: Omit<Group, "names" | "siblings">;
};

/** Places one fact in its group: the collection it sits in, and the change it shares with siblings. */
function placeFact(fact: Fact): Member {
  if (fact.kind === "renamed") {
    const collection = fact.from.slice(0, -1);
    const toName = fact.to.at(-1) ?? "";
    return {
      key: JSON.stringify([fact.kind, fact.pattern, fact.from, toName, fact.earlier]),
      name: fact.from.at(-1) ?? "",
      group: { kind: fact.kind, pattern: fact.pattern, collection, toName, ...(fact.earlier === undefined
        ? {}
        : { earlier: fact.earlier }) },
    };
  }
  if (fact.kind === "moved") {
    const collection = fact.from.slice(0, -1);
    const toCollection = fact.to.slice(0, -1);
    return {
      key: JSON.stringify([fact.kind, fact.pattern, collection, toCollection, fact.earlier]),
      name: fact.from.at(-1) ?? "",
      group: { kind: fact.kind, pattern: fact.pattern, collection, toCollection, ...(fact.earlier === undefined
        ? {}
        : { earlier: fact.earlier }) },
    };
  }
  if (fact.kind === "field") {
    const collection = fact.owner.slice(0, -1);
    return {
      key: JSON.stringify([fact.kind, fact.pattern, collection, fact.text, fact.earlier]),
      name: fact.owner.at(-1) ?? "",
      group: { kind: fact.kind, pattern: fact.pattern, collection, text: fact.text, ...(fact.earlier === undefined
        ? {}
        : { earlier: fact.earlier }) },
    };
  }
  const collection = fact.entity.slice(0, -1);
  return {
    key: JSON.stringify([fact.kind, fact.pattern, collection, fact.earlier]),
    name: fact.entity.at(-1) ?? "",
    group: { kind: fact.kind, pattern: fact.pattern, collection, ...(fact.earlier === undefined
      ? {}
      : { earlier: fact.earlier }) },
  };
}

/** Lists the names a collection held before the step, plus the group's own, as the coverage denominator. */
function listSiblings(before: Tree, collection: Path, names: readonly string[]): readonly string[] {
  const held = readAt(before, collection);

  if (collection.length === 0 || !isRecord(held)) return names;
  return [...new Set([...Object.keys(held), ...names])].sort(compareText);
}

/**
 * Collapses facts that make the same change to siblings of one collection, so a bulk edit
 * reads as one line. Each group carries the names it covers and every sibling the collection
 * held before the step, which is what coverage and exceptions are counted against.
 */
export function groupFacts(facts: readonly Fact[], before: Tree): readonly Group[] {
  const groups = new Map<string, { readonly group: Member["group"]; readonly names: readonly string[] }>();

  for (const fact of facts) {
    const member = placeFact(fact);
    const names = groups.get(member.key)?.names ?? [];
    groups.set(member.key, { group: member.group, names: [...names, member.name] });
  }
  return [...groups.values()].map(({ group, names }) => {
    const sortedNames = [...new Set(names)].sort(compareText);
    return { ...group, names: sortedNames, siblings: listSiblings(before, group.collection, sortedNames) };
  });
}
