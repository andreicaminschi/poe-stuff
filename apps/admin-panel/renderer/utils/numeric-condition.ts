import { CONDITIONS } from "@poe/filter-eval/filter-ast";

const NUMERIC = new Set(
  Object.entries(CONDITIONS)
    .filter(([, spec]) => spec.kind === "numeric")
    .map(([name]) => name.toLowerCase()),
);

/** Whether the filter grammar compares this condition as a number. */
export const numericCondition = (name: string): boolean => NUMERIC.has(name.trim().toLowerCase());
