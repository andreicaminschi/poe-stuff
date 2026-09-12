import { CONDITIONS } from "@poe/filter-eval/filter-ast";

const POE1 = (Object.keys(CONDITIONS) as (keyof typeof CONDITIONS)[]).filter((name) =>
  (CONDITIONS[name].games as readonly string[]).includes("poe1"),
);

/** Every PoE1 filter condition, plus any name the draft already uses, sorted. */
export function conditionOptions(used: readonly string[], current: string): readonly string[] {
  return [...new Set([...POE1, ...used, ...(current === "" ? [] : [current])])].sort();
}
