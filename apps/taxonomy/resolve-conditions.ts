import type { Condition, Version } from "./types.ts";

export type Level = "category" | "subcategory" | "item" | "variant";

export type ResolvedCondition = Condition & { readonly level: Level };

export type Resolution = {
  readonly key: string;
  readonly variant?: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly problems: readonly string[];
};

type Layer = { readonly level: Level; readonly conditions: readonly Condition[] };

const keyOf = (condition: Condition): string =>
  `${condition.condition} ${condition.operator ?? "=="}`;

function compose(layers: readonly Layer[]): readonly ResolvedCondition[] {
  const byKey = new Map<string, ResolvedCondition>();

  for (const { level, conditions } of layers) {
    for (const condition of conditions) {
      if (condition.value === null) byKey.delete(keyOf(condition));
      else byKey.set(keyOf(condition), { ...condition, level });
    }
  }

  return [...byKey.values()];
}

function categoryLayers(
  version: Version,
  category: string,
  subcategory: string | null,
): { readonly layers: readonly Layer[]; readonly problems: readonly string[] } {
  const paths: readonly (readonly [Level, string])[] = [
    ["category", category],
    ...(subcategory === null ? [] : [["subcategory", `${category}/${subcategory}`] as const]),
  ];

  return {
    layers: paths.flatMap(([level, path]) => {
      const record = version.categories[path];
      return record === undefined ? [] : [{ level, conditions: record.conditions }];
    }),
    problems:
      version.categories[category] === undefined
        ? [`is filed under "${category}", which has no category record`]
        : [],
  };
}

const fromName = ({ from: _drop, ...condition }: ResolvedCondition, name: string): ResolvedCondition => ({
  ...condition,
  value: name,
});

function nameProblems(name: string, readsName: boolean): readonly string[] {
  if (!readsName) return [];
  if (name.length === 0) return ["reads its name, which is empty"];
  if (name.includes('"')) return ["has a quote in its name, which a .filter line cannot hold"];

  return [];
}

function fillFromName(
  conditions: readonly ResolvedCondition[],
  name: string,
): { readonly conditions: readonly ResolvedCondition[]; readonly problems: readonly string[] } {
  const readsName = conditions.some((condition) => condition.from === "name");

  return {
    conditions: conditions.map((condition) => (condition.from === "name" ? fromName(condition, name) : condition)),
    problems: nameProblems(name, readsName),
  };
}

const finish = (
  key: string,
  variant: string | undefined,
  composed: readonly ResolvedCondition[],
  name: string,
  inherited: readonly string[],
): Resolution => {
  const filled = fillFromName(composed, name);

  return {
    key,
    ...(variant === undefined ? {} : { variant }),
    conditions: filled.conditions,
    problems: [
      ...inherited,
      ...filled.problems,
      ...(filled.conditions.length === 0 ? ["resolves to no conditions, so matches everything"] : []),
    ],
  };
};

function rowOf(version: Version, key: string) {
  const row = version.items[key] ?? version.authored[key];

  if (row === undefined) {
    throw new Error(`"${key}" is not an item or an authored row in this version`);
  }

  return row;
}

export function resolveRow(version: Version, key: string): readonly Resolution[] {
  const row = rowOf(version, key);
  const { layers, problems } = categoryLayers(version, row.category, row.subcategory);
  const below = [...layers, { level: "item" as const, conditions: row.conditions ?? [] }];
  const variants = version.variants[key];

  if (variants === undefined) {
    return [finish(key, undefined, compose(below), row.name, problems)];
  }

  const resolved = variants.map((variant) =>
    finish(
      key,
      variant.name,
      compose([...below, { level: "variant", conditions: variant.conditions }]),
      row.name,
      problems,
    ),
  );

  const signature = (resolution: Resolution) =>
    JSON.stringify(resolution.conditions.map(({ level, ...condition }) => condition));
  const firstWith = new Map<string, string>();

  for (const resolution of resolved) {
    if (!firstWith.has(signature(resolution))) {
      firstWith.set(signature(resolution), resolution.variant ?? "");
    }
  }

  return resolved.map((resolution) => {
    const first = firstWith.get(signature(resolution));

    return first === resolution.variant
      ? resolution
      : { ...resolution, problems: [...resolution.problems, `resolves the same as variant "${String(first)}"`] };
  });
}

export function resolveCategory(version: Version, path: string): Resolution {
  const [category = "", subcategory = null] = path.split("/");
  const { layers, problems } = categoryLayers(version, category, subcategory);

  return { key: path, conditions: compose(layers), problems };
}

function drawableRows(version: Version): readonly (readonly [string, string])[] {
  return [
    ...Object.entries(version.items)
      .filter(([, row]) => row.excluded !== true && row.filterable !== false)
      .map(([key, row]) => [key, row.category] as const),
    ...Object.entries(version.authored)
      .filter(([, row]) => row.excluded !== true)
      .map(([key, row]) => [key, row.category] as const),
  ];
}

export function resolutionProblems(version: Version): readonly Resolution[] {
  return drawableRows(version)
    .filter(([, category]) => version.categories[category] !== undefined)
    .flatMap(([key]) => resolveRow(version, key))
    .filter((resolution) => resolution.problems.length > 0);
}

export function unauthoredCategories(version: Version): Readonly<Record<string, number>> {
  const counts = new Map<string, number>();

  for (const [, category] of drawableRows(version)) {
    if (version.categories[category] === undefined) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return Object.fromEntries(counts);
}
