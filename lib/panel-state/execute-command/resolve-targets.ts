import type { PanelState, Targets } from "../types.ts";
import { requireCategory, requireSeederCategory } from "./find-seeder.ts";

export type TargetSeeder = { readonly category: string; readonly seeder: string };

/**
 * Lists the seeders a bulk command reaches: every seeder of the named categories, plus the named
 * seeders, minus the excepted ones. Throws on a name that does not exist, an exception outside
 * the targets, or targets that reach nothing, so a wrong command fails before the Judge sees it.
 *
 * @example
 * resolveTargets(state, { categories: ["Bases"], except: ["Amulets"] });
 * // → [{ category: "Bases", seeder: "Wands" }, …every Bases seeder but Amulets]
 */
export function resolveTargets(state: PanelState, targets: Targets): readonly TargetSeeder[] {
  const fromCategories = (targets.categories ?? []).flatMap((category) => Object.keys(requireCategory(state, category).seeders ?? {}).map((seeder) => ({ category, seeder })));
  const named = (targets.seeders ?? []).map((seeder) => ({ category: requireSeederCategory(state, seeder), seeder }));
  const reached = [...new Map([...fromCategories, ...named].map((target) => [target.seeder, target])).values()];
  const except = targets.except ?? [];
  const outside = except.filter((seeder) => !reached.some((target) => target.seeder === seeder));

  if (outside.length > 0) throw new Error(`Not among the targets: ${outside.join(", ")}.`);
  const kept = reached.filter((target) => !except.includes(target.seeder));
  if (kept.length === 0) throw new Error("The targets reach no seeder.");
  return kept;
}
