import { createLakeService } from "@poe/lake/service";
import { resolveForms, type CategoryRecords } from "@poe/filter-compile/resolve-row";
import type { Condition } from "@poe/filter-compile/types";
import { optionalEnv, requireEnv } from "@util/env";
import { collectDomains } from "./condition-domains.ts";
import type { Form } from "./condition-domains/types.ts";
import { catalogKey, categoriesKey, domainsKey } from "./lake/keys.ts";
import { normalizeConditions } from "./normalize-conditions.ts";

type CatalogVariant = { readonly name: string; readonly conditions: readonly Condition[] };

type CatalogRow = {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly subcategory: string | null;
  readonly baseTypes: readonly string[];
  readonly conditions?: readonly Condition[];
  readonly variants?: readonly CatalogVariant[];
};

const formsOf = (categories: CategoryRecords, row: CatalogRow): readonly Form[] =>
  resolveForms(
    categories,
    {
      name: row.name,
      baseTypes: row.baseTypes,
      category: row.category,
      subcategory: row.subcategory,
      conditions: row.conditions ?? [],
    },
    row.variants,
  ).map((form) => ({
    key: row.key,
    category: row.category,
    subcategory: row.subcategory,
    ...(form.variant === undefined ? {} : { variant: form.variant }),
    conditions: form.conditions,
  }));

const groupByCategory = (forms: readonly Form[]): ReadonlyMap<string, readonly Form[]> => {
  const groups = new Map<string, Form[]>();

  for (const form of forms) {
    const held = groups.get(form.category);

    if (held === undefined) groups.set(form.category, [form]);
    else held.push(form);
  }

  return groups;
};

function report(what: string, problems: readonly string[]): void {
  if (problems.length === 0) return;

  process.stdout.write(`${what}: ${problems.length} problems\n`);

  for (const problem of problems.slice(0, 10)) process.stdout.write(`  ${problem}\n`);
}

async function main(): Promise<void> {
  const league = requireEnv("POE_LEAGUE");
  const lake = createLakeService({ root: optionalEnv("LAKE_ROOT") });

  const rows = await lake.readJson<readonly CatalogRow[]>(catalogKey(league));
  const categories = await lake.readJson<CategoryRecords>(categoriesKey(league));

  const forms = rows.flatMap((row) => formsOf(categories, row));
  const { domains, problems } = collectDomains(forms);

  const key = domainsKey(league);

  await lake.writeJsonAtomic(key, { league, domains });

  process.stdout.write(
    `${forms.length} forms, ${Object.keys(domains).length} conditions -> ${key}\n`,
  );
  report("domains", problems);

  for (const [category, group] of groupByCategory(forms)) {
    const normalized = normalizeConditions(group, domains);

    process.stdout.write(
      `${category}: ${normalized.forms.length} forms, ${normalized.filled} clauses filled\n`,
    );
    report(category, normalized.problems);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
