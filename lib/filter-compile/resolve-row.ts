import { composeTrace, type Composed } from "./compose.ts";
import { fillFrom } from "./fill-from.ts";
import type { Condition, FromSource, Layer, RemovedCondition, ResolvedCondition } from "./types.ts";

export type CategoryRecords = Readonly<Record<string, { readonly conditions: readonly Condition[] }>>;

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

/** A category or subcategory with no record adds nothing, and that is not a problem. */
export function categoryLayers(
  categories: CategoryRecords,
  category: string,
  subcategory: string | null,
): readonly Layer[] {
  const paths: readonly (readonly ["category" | "subcategory", string])[] = [
    ["category", category],
    ...(subcategory === null ? [] : [["subcategory", `${category}/${subcategory}`] as const]),
  ];

  return paths.flatMap(([level, path]) => {
    const record = categories[path];
    return record === undefined ? [] : [{ level, conditions: record.conditions }];
  });
}

/** What a category path alone composes to. A `from` stays a reference, since there is no row. */
export function resolvePath(categories: CategoryRecords, path: string): Composed {
  const [category = "", subcategory = null] = path.split("/");

  return composeTrace(categoryLayers(categories, category, subcategory));
}

function formOf(variant: string | undefined, composed: Composed, row: FromSource): Form {
  const filled = fillFrom(composed.applied, row);

  return {
    ...(variant === undefined ? {} : { variant }),
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
 */
export function resolveForms(
  categories: CategoryRecords,
  row: ResolvableRow,
  variants?: readonly ResolvableVariant[],
): readonly Form[] {
  const below = [
    ...categoryLayers(categories, row.category, row.subcategory),
    { level: "item" as const, conditions: row.conditions },
  ];

  if (variants === undefined || variants.length === 0) return [formOf(undefined, composeTrace(below), row)];

  const forms = variants.map((variant) =>
    formOf(variant.name, composeTrace([...below, { level: "variant", conditions: variant.conditions }]), row),
  );

  const signature = (form: Form) =>
    JSON.stringify(form.conditions.map(({ level, overrides, ...condition }) => condition));
  const firstWith = new Map<string, string>();

  for (const form of forms) {
    if (!firstWith.has(signature(form))) firstWith.set(signature(form), form.variant ?? "");
  }

  return forms.map((form) => {
    const first = firstWith.get(signature(form));

    return first === form.variant
      ? form
      : { ...form, problems: [...form.problems, `resolves the same as variant "${String(first)}"`] };
  });
}
