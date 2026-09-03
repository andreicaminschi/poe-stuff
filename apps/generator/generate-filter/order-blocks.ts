import { byFloor } from "./tier-of.ts";
import type { Decision, Tier } from "./types.ts";

const textOf = (decision: Decision): string =>
  JSON.stringify(decision.conditions) + decision.freehand;

/**
 * Blocks in the order the game must read them, derived and never authored.
 *
 * First match wins, so a block has to come before any block that would take its items. A
 * block with more conditions matches fewer items — a unique block is its base's conditions
 * plus a rarity — so more conditions go first, and that alone puts every narrower block
 * ahead of the wider one it sits inside. Ties go to the louder tier, then to the text, so
 * two runs over the same input produce the same file.
 */
export function orderBlocks(
  decisions: readonly Decision[],
  tiers: readonly Tier[],
): readonly Decision[] {
  const rank = new Map(byFloor(tiers).map((tier, index) => [tier.name, index]));
  const rankOf = (decision: Decision): number => rank.get(decision.tier) ?? tiers.length;

  return [...decisions].sort(
    (a, b) =>
      b.conditions.length - a.conditions.length ||
      rankOf(a) - rankOf(b) ||
      textOf(a).localeCompare(textOf(b)),
  );
}
