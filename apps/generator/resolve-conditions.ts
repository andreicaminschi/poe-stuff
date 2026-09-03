import type {
  Condition,
  TaxonomyCategory,
  TaxonomyVariant,
} from "@poe/taxonomy/get-taxonomy.types";

/** One form of a unique as the catalog prices it: a listing, or a corruption outcome of one. */
export type UniqueListing = {
  readonly name: string;
  /** Chaos, a listing price. */
  readonly meanPrice: number;
  readonly corrupted: boolean;
};

/**
 * The uniques on a base that one block draws, filed under the category path whose
 * conditions tell them apart on the ground. Resolved like a row's, through `categories`.
 */
export type UniqueGroup = {
  readonly category: string;
  readonly subcategory: string | null;
  readonly listings: readonly UniqueListing[];
};

/**
 * What the generator needs off a catalog row, declared here rather than imported.
 *
 * An app is never imported by another, so the generator names the shape it reads and the
 * catalog answers with a row that fits. `catalog.json` is the contract between them, and it
 * is a published format rather than a shared module — the same arrangement `@poe/item-parser`
 * has with GGG's stat list.
 *
 * A price is on the row or on each variant, never both. A base carries its uniques and is
 * not one of them.
 */
export type CatalogRow = {
  readonly key: string;
  readonly name: string | null;
  readonly baseTypes: readonly string[];
  readonly category: string | null;
  readonly subcategory: string | null;
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly (TaxonomyVariant & { readonly meanPrice?: number })[];
  /** Chaos, a listing price. Only on a row without variants. */
  readonly meanPrice?: number;
  readonly uniques?: readonly UniqueGroup[];
};

/** One block a row is worth: the conditions to write, and the variant they came from. */
export type ItemRule = {
  readonly variant: string | null;
  readonly conditions: readonly Condition[];
};

export type Categories = Readonly<Record<string, TaxonomyCategory>>;

/** What `from` may name, and what each one reads off the row. */
const FIELDS: Readonly<Record<string, (item: CatalogRow) => readonly string[]>> = {
  name: (item) => (item.name === null ? [] : [item.name]),
  baseTypes: (item) => item.baseTypes,
};

/** A filter has no escape for a quote inside a `BaseType`, so such a name cannot be written. */
const QUOTE = '"';

const DEFAULT_OPERATOR = "==";

/**
 * What two conditions have to share to be the same one.
 *
 * Operator is half the key on purpose. `MapTier >= 11` and `MapTier <= 15` are one condition
 * name and two conditions, and a key of the name alone could never hold both.
 */
const keyOf = (condition: Condition): string =>
  `${condition.condition} ${condition.operator ?? DEFAULT_OPERATOR}`;

/**
 * Lays one level's conditions over another's.
 *
 * Order is the whole mechanism: category, then subcategory, then item, then variant. A later
 * level replaces a condition of the same name and operator, and `value: null` takes it out
 * altogether — which is how a subcategory that draws a flag drops the `BaseType` its category
 * authored.
 */
function compose(levels: readonly (readonly Condition[])[]): readonly Condition[] {
  const merged = new Map<string, Condition>();

  for (const level of levels) {
    for (const condition of level) {
      const key = keyOf(condition);

      if (condition.value === null) merged.delete(key);
      else merged.set(key, condition);
    }
  }

  return [...merged.values()];
}

/** Every level above the item: the category, then the subcategory when there is one. */
function categoryPaths(item: CatalogRow): readonly string[] {
  if (item.category === null) return [];

  return item.subcategory === null
    ? [item.category]
    : [item.category, `${item.category}/${item.subcategory}`];
}

/**
 * Reads a `from` condition off the row, or says why it cannot be written.
 *
 * A condition with no `from` is a literal and passes through untouched — `BlightedMap true`
 * and `EnchantmentPassiveNode ["Feast of Flesh"]` name nothing about the row and never will.
 */
function fill(condition: Condition, item: CatalogRow): Condition {
  if (condition.from === undefined) return condition;

  const read = FIELDS[condition.from];

  if (read === undefined) {
    throw new Error(
      `${item.key}: condition ${condition.condition} reads from "${condition.from}", which is not a row field`,
    );
  }

  const values = read(item);

  if (values.length === 0) {
    throw new Error(
      `${item.key}: condition ${condition.condition} reads from "${condition.from}", which is empty on this row`,
    );
  }

  const quoted = values.filter((value) => value.includes(QUOTE));

  if (quoted.length > 0) {
    throw new Error(
      `${item.key}: a filter cannot write a quote inside ${condition.condition}: ${quoted.join(", ")}`,
    );
  }

  // `from` stays on the filled condition. It is the one condition that names the row, and
  // the grouping step merges rows that agree on everything else by widening exactly it.
  return {
    condition: condition.condition,
    operator: condition.operator ?? DEFAULT_OPERATOR,
    value: values,
    from: condition.from,
  };
}

/**
 * The finished set for one rule, with every `from` read off the row.
 *
 * **An empty set is refused.** `Show` with no condition matches every item in the game and
 * the filter stops there, so a rule that resolves to nothing is the worst thing this can
 * produce and the one thing it must never write.
 */
function finish(
  conditions: readonly Condition[],
  item: CatalogRow,
  variant: string | null,
): ItemRule {
  const filled = conditions.map((condition) => fill(condition, item));

  if (filled.length === 0) {
    throw new Error(
      `${item.key}${variant === null ? "" : ` (${variant})`}: resolves to no conditions, which would match every item in the game`,
    );
  }

  return { variant, conditions: filled };
}

/**
 * Every block one row is worth, as the four levels compose into it.
 *
 * A row with no variants is one rule. A row with variants is one rule per variant and none
 * for itself — a price attaches to a variant, so a variant is what gets drawn. An item that
 * needs a plain form as well writes a variant with no conditions; nothing is implied, the
 * same way nothing else here is.
 *
 * **A category with no record throws.** Every row under it would otherwise vanish from the
 * generated filter with nothing saying so, which is the same failure as a row the taxonomy
 * cannot classify and deserves the same answer.
 */
export function resolveConditions(
  item: CatalogRow,
  categories: Categories,
): readonly ItemRule[] {
  const levels: (readonly Condition[])[] = [];

  for (const path of categoryPaths(item)) {
    const record = categories[path];

    if (record === undefined) {
      throw new Error(
        `${item.key}: no conditions authored for category "${path}"`,
      );
    }

    levels.push(record.conditions);
  }

  levels.push(item.conditions ?? []);

  const base = compose(levels);
  const variants = item.variants ?? [];

  if (variants.length === 0) return [finish(base, item, null)];

  const rules = variants.map((variant) =>
    finish(compose([base, variant.conditions]), item, variant.name),
  );

  const seen = new Map<string, string>();

  for (const rule of rules) {
    const shape = rule.conditions
      .map((condition) => `${keyOf(condition)} ${JSON.stringify(condition.value)}`)
      .sort()
      .join("; ");

    const first = seen.get(shape);

    if (first !== undefined) {
      throw new Error(
        `${item.key}: variants "${first}" and "${rule.variant ?? ""}" resolve to the same conditions`,
      );
    }

    seen.set(shape, rule.variant ?? "");
  }

  return rules;
}
