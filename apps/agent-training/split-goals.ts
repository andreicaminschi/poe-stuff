import { deriveSeed } from "./build-goals/derive-seed.ts";
import { listMentionedNames, listProtectedStrings } from "./build-goals/garble-request.ts";
import type { Goal } from "./types.ts";

/** One template in this many is held out of training. */
const TEMPLATE_HOLDOUT = 5;

/** One seeder name in this many is held out of training. */
const SEEDER_HOLDOUT = 10;

export type GoalSplit = "seen" | "held-out";

/** Escapes a string for use inside a regular expression. */
const escapePattern = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Reduces a goal to its template: the clean request with every name and value masked, and a
 * masked list collapsed to one mask, so the same template reads the same whatever it was filled
 * with.
 *
 * @example
 * signTemplate(goal, names); // "Tag Rings, Belts and Amulets as chase" → "tag X as X"
 */
export function signTemplate(goal: Goal, storedNames: readonly string[]): string {
  const values = [...listProtectedStrings([...goal.setup, ...goal.steps]), ...listMentionedNames(goal.clean, storedNames)]
    .sort((left, right) => right.length - left.length);
  const masked = values.reduce((text, value) => text.replace(new RegExp(escapePattern(value), "gi"), "§"), goal.clean);

  return masked
    .replace(/\d+/g, "§")
    .replace(/§(?:, §)*(?: and §)?/g, "X")
    .toLowerCase();
}

/** Lists the stored seeder names a goal's commands or request use. */
const listGoalSeeders = (goal: Goal, seederNames: readonly string[]): readonly string[] =>
  listMentionedNames([goal.clean, ...listProtectedStrings([...goal.setup, ...goal.steps])].join("\n"), seederNames);

/**
 * Decides whether a goal may be trained on. It is held out when its template is one of the
 * held-out templates, or when it uses a held-out seeder name. Both are fixed by a hash, so the same
 * template or name is held out in every run and every seed.
 */
export function splitGoal(goal: Goal, storedNames: readonly string[], seederNames: readonly string[]): GoalSplit {
  const heldOutTemplate = deriveSeed(0, signTemplate(goal, storedNames)) % TEMPLATE_HOLDOUT === 0;
  const heldOutSeeder = listGoalSeeders(goal, seederNames).some((name) => deriveSeed(0, name) % SEEDER_HOLDOUT === 0);

  return heldOutTemplate || heldOutSeeder
    ? "held-out"
    : "seen";
}
