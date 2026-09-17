import type { Condition } from "@poe/filter-compile/types";

/** One form a row draws as: the row itself, or one of its variants, already resolved. */
export type Form = {
  readonly key: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly variant?: string;
  readonly conditions: readonly Condition[];
};

export type SetClause = {
  readonly kind: "set";
  readonly values: readonly string[];
};

/** An absent bound is open, because the conditions never named one. */
export type RangeClause = {
  readonly kind: "range";
  readonly min?: number;
  readonly max?: number;
};

export type Clause = SetClause | RangeClause;

export type ClauseTable = Readonly<Record<string, Clause>>;

export type ClauseResult = {
  readonly clauses: ClauseTable;
  readonly problems: readonly string[];
};

/**
 * Where a domain's values come from.
 *
 * `registry` is closed: `@poe/filter-eval` publishes every value the condition takes, so the
 * domain is the same next run. `observed` is the union of what this catalog happened to
 * carry, so it moves when the catalog moves.
 */
export type DomainSource = "registry" | "observed";

export type SetDomain = {
  readonly kind: "set";
  readonly source: DomainSource;
  readonly values: readonly string[];
};

export type RangeDomain = {
  readonly kind: "range";
  readonly source: DomainSource;
  readonly min?: number;
  readonly max?: number;
};

export type Domain = SetDomain | RangeDomain;

export type DomainTable = Readonly<Record<string, Domain>>;

export type Domains = {
  readonly domains: DomainTable;
  readonly problems: readonly string[];
};

/** A form with every condition the group uses, the missing ones widened to their domain. */
export type NormalForm = {
  readonly key: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly variant?: string;
  readonly clauses: ClauseTable;
};

export type Normalized = {
  readonly forms: readonly NormalForm[];
  readonly filled: number;
  readonly problems: readonly string[];
};
