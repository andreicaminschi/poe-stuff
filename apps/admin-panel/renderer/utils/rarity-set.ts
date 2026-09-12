import { CONDITIONS } from "@poe/filter-eval/filter-ast";
import type { Condition } from "../../api/taxonomy/types.ts";

export const RARITIES: readonly string[] = CONDITIONS.Rarity.order;

const listOf = (value: Condition["value"]): readonly string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
};

/** The rarities a Rarity condition lets through, whatever form it was written in. */
export function raritySet(condition: Condition): readonly string[] {
  const named = listOf(condition.value).flatMap((value) => {
    const rarity = RARITIES.find((one) => one.toLowerCase() === value.trim().toLowerCase());
    return rarity === undefined ? [] : [rarity];
  });
  const first = named[0];
  if (first === undefined) return [];

  const at = RARITIES.indexOf(first);
  const operator = condition.operator ?? "==";
  if (operator === ">") return RARITIES.slice(at + 1);
  if (operator === ">=") return RARITIES.slice(at);
  if (operator === "<") return RARITIES.slice(0, at);
  if (operator === "<=") return RARITIES.slice(0, at + 1);
  if (operator === "!" || operator === "!=") return RARITIES.filter((rarity) => !named.includes(rarity));

  return RARITIES.filter((rarity) => named.includes(rarity));
}
