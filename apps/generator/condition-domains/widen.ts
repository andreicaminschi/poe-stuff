import { CONDITIONS, CONDITIONS_BY_LOWER, type ConditionName } from "@poe/filter-eval/filter-ast";
import type { Clause, Domain } from "./types.ts";

/**
 * The values a condition takes, as `@poe/filter-eval` publishes them.
 *
 * A closed set here is worth more than an observed one: it holds every value whether the
 * catalog carried it or not, so it does not move between runs.
 */
export function seedDomain(name: string): Domain | undefined {
  const known = CONDITIONS_BY_LOWER.get(name.toLowerCase());

  if (known === undefined) return undefined;

  const values = seedValues(known);

  return values === undefined ? undefined : { kind: "set", source: "registry", values };
}

function seedValues(name: ConditionName): readonly string[] | undefined {
  const entry = CONDITIONS[name];

  if (entry.kind === "boolean") return ["True", "False"];
  if ("order" in entry) return entry.order;
  if ("values" in entry) return entry.values;

  return undefined;
}

const widest = (
  held: number | undefined,
  fresh: number | undefined,
  pick: (a: number, b: number) => number,
): number | undefined => (held === undefined || fresh === undefined ? undefined : pick(held, fresh));

/**
 * One clause folded into the domain of every clause before it.
 *
 * A registry domain is never widened. A value outside it is a problem rather than a new
 * member, because the registry is the closed set the game accepts.
 */
export function widen(domain: Domain | undefined, clause: Clause): Domain | string {
  if (domain === undefined) return { ...clause, source: "observed" };

  if (domain.kind !== clause.kind) {
    return `holds a ${clause.kind} and a ${domain.kind} under one name`;
  }

  if (clause.kind === "set" && domain.kind === "set") {
    if (domain.source === "registry") {
      const off = clause.values.filter((one) => !domain.values.includes(one));

      return off.length === 0 ? domain : `has values the registry does not list: ${off.join(", ")}`;
    }

    const fresh = clause.values.filter((one) => !domain.values.includes(one));

    return fresh.length === 0 ? domain : { ...domain, values: [...domain.values, ...fresh] };
  }

  if (clause.kind === "range" && domain.kind === "range") {
    const min = widest(domain.min, clause.min, Math.min);
    const max = widest(domain.max, clause.max, Math.max);

    return {
      kind: "range",
      source: domain.source,
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    };
  }

  return domain;
}
