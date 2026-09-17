import { toClauses } from "./condition-domains/to-clauses.ts";
import type { Clause, ClauseTable, DomainTable, Form, NormalForm, Normalized } from "./condition-domains/types.ts";

const clauseOf = (domain: DomainTable[string]): Clause =>
  domain.kind === "set"
    ? { kind: "set", values: domain.values }
    : {
        kind: "range",
        ...(domain.min === undefined ? {} : { min: domain.min }),
        ...(domain.max === undefined ? {} : { max: domain.max }),
      };

const namesUsed = (tables: readonly ClauseTable[]): readonly string[] => [
  ...new Set(tables.flatMap((table) => Object.keys(table))),
];

const identity = (form: Form) => ({
  key: form.key,
  category: form.category,
  subcategory: form.subcategory,
  ...(form.variant === undefined ? {} : { variant: form.variant }),
});

/**
 * One group's forms with every condition the group uses, so no form is silently wider than
 * another.
 *
 * A form that never named a condition its neighbours did matches every value of it. Writing
 * that out as the condition's whole domain makes the forms comparable, and makes the blocks
 * that come out of them mutually exclusive, so their order stops mattering.
 *
 * The group is the scope on purpose. Filling a condition no form in the group ever used
 * would add a line that is true of everything and says nothing.
 */
export function normalizeConditions(
  forms: readonly Form[],
  domains: DomainTable,
): Normalized {
  const read = forms.map((form) => toClauses(form.conditions).clauses);
  const names = namesUsed(read);

  const problems: string[] = [];
  let filled = 0;

  const normalized: NormalForm[] = forms.map((form, index) => {
    const held = read[index] ?? {};
    const missing: Record<string, Clause> = {};

    for (const name of names) {
      if (held[name] !== undefined) continue;

      const domain = domains[name];

      if (domain === undefined) {
        problems.push(`${form.key}: ${name} has no domain to widen to`);
        continue;
      }

      missing[name] = clauseOf(domain);
      filled += 1;
    }

    return { ...identity(form), clauses: { ...held, ...missing } };
  });

  return { forms: normalized, filled, problems };
}
