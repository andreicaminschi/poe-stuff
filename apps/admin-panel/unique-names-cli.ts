import { randomUUID } from "node:crypto";
import { createLakeService } from "@poe/lake/service";
import { executeCommand } from "./commands.ts";
import { loadVersion } from "./load-version.ts";
import { listUniqueRenames } from "./migrate/unique-seeder-names.ts";
import { requireSeeder } from "./panel-state.ts";
import { saveVersion } from "./save-version.ts";
import type { PanelState } from "./types.ts";

/** Renames every repeated seeder through `replaceSeeder`, then saves the renames as a draft. Low, Sonar 0. */
async function main(): Promise<void> {
  const lake = createLakeService();
  const loaded = await loadVersion(lake);
  const renames = listUniqueRenames(loaded.categories);
  const renamed = renames.reduce<PanelState>((state, rename) => executeCommand(
    state,
    { type: "replaceSeeder", category: rename.category, seeder: rename.from, with: { ...requireSeeder(state.categories, rename.category, rename.from), name: rename.to } },
    { id: randomUUID(), at: new Date().toISOString(), actor: "migration" },
  ), { ...loaded, pending: [] });
  const saved = await saveVersion(lake, loaded.version, renamed.categories, renamed.pending);

  console.log(`Renamed ${String(renames.length)} seeders from ${loaded.version} into ${saved.version}.`);
}

await main();
