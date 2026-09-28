import { composeLayers, type Composed } from "./compose-layers.ts";
import { fillFromRow } from "./fill-from-row.ts";
import type { Condition, FromSource, Layer, RemovedCondition, ResolvedCondition } from "./types.ts";

export type CategoryRecords = Readonly<
  Record<string, { readonly conditions: readonly Condition[]; readonly order?: number; readonly catchAll?: boolean }>
>;

export type ResolvableRow = FromSource & {
  readonly category: string;
  readonly subcategory: string | null;
  readonly conditions: readonly Condition[];
};

export type ResolvableVariant = { readonly name: string; readonly conditions: readonly Condition[] };

/** One form a row is drawn as: the row itself, or one of its variants. */
export type Form = {
  readonly variant?: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly removed: readonly RemovedCondition[];
  readonly problems: readonly string[];
};

/**
 * Finds the condition layers a row inherits from its category and subcategory, top first.
 * A category or subcategory with no record adds nothing, and that is not a problem.
 */
export function findCategoryLayers(
  categories: CategoryRecords,
  category: string,
  subcategory: string | null,
): readonly Layer[] {
  const paths: readonly (readonly ["category" | "subcategory", string])[] = [
    ["category", category],
    ...(subcategory === null
      ? []
      : [["subcategory", `${category}/${subcategory}`] as const]),
  ];

  return paths.flatMap(([level, path]) => {
    const record = categories[path];
    return record === undefined
      ? []
      : [{ level, conditions: record.conditions }];
  });
}

/** What a category path alone composes to. A `from` stays a reference, since there is no row. */
export function resolvePath(categories: CategoryRecords, path: string): Composed {
  const [category = "", subcategory = null] = path.split("/");

  return composeLayers(findCategoryLayers(categories, category, subcategory));
}

/** Builds one form from its composed conditions, with every `from` filled off the row. */
function buildForm(variant: string | undefined, composed: Composed, row: FromSource): Form {
  const filled = fillFromRow(composed.applied, row);

  return {
    ...(variant === undefined
      ? {}
      : { variant }),
    conditions: filled.conditions,
    removed: composed.removed,
    problems: filled.problems,
  };
}

/**
 * Every form a row is drawn as, with the conditions it resolves to and what was removed on
 * the way.
 *
 * Category, subcategory, row and variant are laid over each other, and every `from` is filled
 * off the row. A row with no variants is one form. A variant that resolves the same as an
 * earlier one is reported, naming the first.
 *
 * @example
 * resolveForms(
 *   { gems: { conditions: [{ condition: "Class", operator: "==", value: "Skill Gems" }] } },
 *   { name: "Fireball", baseTypes: ["Fireball"], category: "gems", subcategory: null,
 *     conditions: [{ condition: "BaseType", operator: "==", from: "name" }] },
 *   [{ name: "20/20", conditions: [{ condition: "GemLevel", operator: ">=", value: 20 }] }],
 * );
 * // → [{ variant: "20/20",
 * //      conditions: [Class == "Skill Gems", BaseType == "Fireball", GemLevel >= 20],
 * //      removed: [], problems: [] }]
 */
export function resolveForms(
  categories: CategoryRecords,
  row: ResolvableRow,
  variants?: readonly ResolvableVariant[],
): readonly Form[] {
  const rowLayers = [
    ...findCategoryLayers(categories, row.category, row.subcategory),
    { level: "item" as const, conditions: row.conditions },
  ];

  if (variants === undefined || variants.length === 0) return [buildForm(undefined, composeLayers(rowLayers), row)];

  const forms = variants.map((variant) =>
    buildForm(variant.name, composeLayers([...rowLayers, { level: "variant", conditions: variant.conditions }]), row),
  );

  const signature = (form: Form) =>
    JSON.stringify(form.conditions.map(({ level, overrides, ...condition }) => condition));
  const firstVariantBySignature = new Map<string, string>();

  for (const form of forms) {
    if (!firstVariantBySignature.has(signature(form))) firstVariantBySignature.set(signature(form), form.variant ?? "");
  }

  return forms.map((form) => {
    const first = firstVariantBySignature.get(signature(form));

    return first === form.variant
      ? form
      : { ...form, problems: [...form.problems, `resolves the same as variant "${String(first)}"`] };
  });
}
