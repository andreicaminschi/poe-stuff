import { sourceKey } from "./lake.ts";
import { readVersionFiles } from "./read-version-files.ts";
import type { Lake } from "@poe/lake/types";
import type { Version, VersionFiles } from "./types.ts";
import { validateCategoryTable } from "./validate-conditions.ts";
import { validateAuthoredTable } from "./validate-authored.ts";
import { validateTaxonomyTable } from "./validate-table.ts";
import { validateVariantTable } from "./validate-variants.ts";

export function buildVersion(version: string, files: VersionFiles): Version {
  const named = (file: keyof VersionFiles) => sourceKey(version, file);

  const items = validateTaxonomyTable(files.items, named("items"));

  const authored = {
    ...validateAuthoredTable(files["authored.seeded"], named("authored.seeded")),
    ...validateAuthoredTable(files["authored.manual"], named("authored.manual")),
  };

  const known = new Set([...Object.keys(items), ...Object.keys(authored)]);

  const variants = {
    ...validateVariantTable(files["variants.seeded"], known, named("variants.seeded")),
    ...validateVariantTable(files["variants.manual"], known, named("variants.manual")),
  };

  return {
    items,
    categories: validateCategoryTable(files.categories, named("categories")),
    authored,
    variants,
  };
}

export async function versionTable(lake: Lake, version: string): Promise<Version> {
  return buildVersion(version, await readVersionFiles(lake, version));
}
