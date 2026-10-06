import diff from "microdiff";
import type { EntityFact, Fact, MoveFact, SummaryConfig } from "../types.ts";
import { isRecord } from "./is-record.ts";
import { listFacts } from "./list-facts.ts";
import { listMatches, type Match } from "./list-matches.ts";

type UniqueMatch = Match & { readonly pattern: string };

/** Lists every unique-level entry an added or removed entity carries, itself included. */
const listUniqueEntries = (facts: readonly Fact[], kind: EntityFact["kind"], uniquePatterns: readonly string[]): readonly UniqueMatch[] =>
  facts.flatMap((fact) => (fact.kind === kind
    ? uniquePatterns.flatMap((pattern) => listMatches(fact.entity, fact.value, pattern).map((match) => ({ ...match, pattern })))
    : []));

/** Lists the field facts for what changed inside an entry while it moved. */
function listMovedEdits(from: UniqueMatch, to: UniqueMatch, config: SummaryConfig): readonly Fact[] {
  if (!isRecord(from.value) || !isRecord(to.value)) return [];
  return listFacts(diff(from.value, to.value).map((change) => ({ ...change, path: [...to.path, ...change.path.map(String)] })), config);
}

/**
 * Turns the removal and the creation of one unique name into a single move, so a seeder that
 * changes category reads as moved. A removed category still yields the seeders it held, which
 * is how a merge reads as seeders moved plus a category removed.
 */
export function pairMoves(facts: readonly Fact[], config: SummaryConfig): readonly Fact[] {
  const uniquePatterns = Object.entries(config.levels).filter(([, level]) => level.unique === true).map(([pattern]) => pattern);
  const removedEntries = listUniqueEntries(facts, "removed", uniquePatterns);
  const addedEntries = listUniqueEntries(facts, "added", uniquePatterns);
  const pairs = removedEntries.flatMap((from) => {
    const to = addedEntries.find((entry) => entry.pattern === from.pattern && entry.path.at(-1) === from.path.at(-1));
    return to === undefined
      ? []
      : [{ from, to }];
  });
  const pairedPaths = new Set(pairs.flatMap(({ from, to }) => [JSON.stringify(from.path), JSON.stringify(to.path)]));
  const unpaired = facts.filter((fact) => (fact.kind !== "added" && fact.kind !== "removed") || !pairedPaths.has(JSON.stringify(fact.entity)));
  const moves = pairs.flatMap(({ from, to }): readonly Fact[] => [
    { kind: "moved", pattern: from.pattern, from: from.path, to: to.path, path: from.path } satisfies MoveFact,
    ...listMovedEdits(from, to, config),
  ]);

  return [...unpaired, ...moves];
}
