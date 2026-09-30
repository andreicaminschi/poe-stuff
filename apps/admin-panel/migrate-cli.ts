import { createLakeService } from "@poe/lake/service";
import { migrateTaxonomy } from "./migrate.ts";
import { writeVersion } from "./migrate/write-version.ts";
import type { OldCategories, OldTaxonomy } from "./migrate/old-taxonomy.ts";

/** Migrates the promoted old taxonomy into a new admin-panel version and reports what it left out. Low, Sonar 0. */
async function main(): Promise<void> {
  const lake = createLakeService();
  const taxonomy = await lake.readJson<OldTaxonomy>("taxonomy/latest/taxonomy.json");
  const oldCategories = await lake.readJson<OldCategories>("taxonomy/latest/categories.json");
  const migrated = migrateTaxonomy(taxonomy, oldCategories);
  const version = await writeVersion(lake, migrated.categories);

  console.log(`Wrote ${version}: ${String(migrated.categories.length)} categories.`);
  console.log(`Left out ${String(migrated.skipped.length)} rows:`);
  migrated.skipped.forEach(({ path, name, reason }) => console.log(`  ${path}  ${name}  (${reason})`));
}

await main();
