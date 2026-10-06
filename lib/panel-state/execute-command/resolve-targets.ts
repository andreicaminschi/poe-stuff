import { resolveName } from "../resolve-name.ts";
import type { PanelState, Targets } from "../types.ts";
import { resolveCategory, resolveSeeder } from "./find-seeder.ts";

export type TargetSeeder = { readonly category: string; readonly seeder: string };

/**
 * Lists the seeders a bulk command reaches: every seeder of the named categories, plus the named
 * seeders, minus the excepted ones. Misspelt names resolve to the stored name when one is close
 * enough, and an exception resolves among the seeders reached. Throws on a name that matches
 * nothing, an exception outside the targets, or targets that reach nothing, so a wrong command
 * fails before the Judge sees it.
 *
 * @example
 * resolveTargets(state, { categories: ["Bases"], except: ["amulets"] });
 * // → [{ category: "Bases", seeder: "Wands" }, …every Bases seeder but Amulets]
 */
export function resolveTargets(state: PanelState, targets: Targets): readonly TargetSeeder[] {
  const fromCategories = (targets.categories ?? []).flatMap((name) => {
    const category = resolveCategory(state, name);
    return Object.keys(state.categories[category]?.seeders ?? {}).map((seeder) => ({ category, seeder }));
  });
  const named = (targets.seeders ?? []).map((name) => resolveSeeder(state, name));
  const reached = [...new Map([...fromCategories, ...named].map((target) => [target.seeder, target])).values()];
  const reachedNames = reached.map((target) => target.seeder);
  const except = (targets.except ?? []).map((name) => ({ name, seeder: resolveName(name, reachedNames) }));
  const outside = except.filter((entry) => entry.seeder === undefined).map((entry) => entry.name);

  if (outside.length > 0) throw new Error(`Not among the targets: ${outside.join(", ")}.`);
  const excluded = except.map((entry) => entry.seeder);
  const kept = reached.filter((target) => !excluded.includes(target.seeder));
  if (kept.length === 0) throw new Error("The targets reach no seeder.");
  return kept;
}
