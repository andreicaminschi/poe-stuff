import { toClauses } from "./condition-domains/to-clauses.ts";
import type { Domain, Domains, Form } from "./condition-domains/types.ts";
import { seedDomain, widen } from "./condition-domains/widen.ts";

const label = (form: Form): string =>
  form.variant === undefined ? form.key : `${form.key} (${form.variant})`;

/**
 * Every value each condition takes across the whole catalog, keyed by condition name.
 *
 * One walk over every form. A condition `@poe/filter-eval` publishes a closed set for keeps
 * that set; everything else is the union of what the forms carried, which is why the result
 * belongs in the run's output rather than in code.
 */
export function collectDomains(forms: readonly Form[]): Domains {
  const domains: Record<string, Domain> = {};
  const problems: string[] = [];

  for (const form of forms) {
    const read = toClauses(form.conditions);

    for (const problem of read.problems) problems.push(`${label(form)}: ${problem}`);

    for (const [name, clause] of Object.entries(read.clauses)) {
      const held = domains[name] ?? seedDomain(name);
      const wider = widen(held, clause);

      if (typeof wider === "string") {
        problems.push(`${label(form)}: ${name} ${wider}`);
        continue;
      }

      domains[name] = wider;
    }
  }

  return { domains, problems };
}
