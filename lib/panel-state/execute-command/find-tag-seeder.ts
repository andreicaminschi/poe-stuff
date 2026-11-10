import { resolveName } from "../resolve-name.ts";
import type { PanelState } from "../types.ts";

/** Finds the stored tag seeder a typed name means, or throws. A misspelt name resolves when one tag seeder is close enough. */
export function resolveTagSeeder(state: PanelState, name: string): string {
  const tagSeeder = resolveName(name, Object.keys(state.tagSeeders));

  if (tagSeeder === undefined) throw new Error(`No tag seeder "${name}".`);
  return tagSeeder;
}
