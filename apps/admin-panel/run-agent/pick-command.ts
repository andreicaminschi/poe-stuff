import { COMMAND_PARTS } from "../command-parts.ts";
import type { ToolType } from "../commands.ts";
import { REPHRASE } from "../decision-options.ts";
import { topLabel } from "./load-encoder.ts";

/**
 * Rephrase when it is the top action. Otherwise every real command, best first, scored by its
 * action probability times its target probability, so an impossible pair never appears.
 * Low, Sonar 1.
 */
export function rankCommands(actions: ReadonlyMap<string, number>, targets: ReadonlyMap<string, number>): readonly ToolType[] | typeof REPHRASE {
  if (topLabel(actions) === "rephrase") return REPHRASE;

  return (Object.entries(COMMAND_PARTS) as [ToolType, { readonly action: string; readonly target: string }][])
    .map(([type, parts]) => ({ type, score: (actions.get(parts.action) ?? 0) * (targets.get(parts.target) ?? 0) }))
    .sort((left, right) => right.score - left.score)
    .map(({ type }) => type);
}

/** The single best command, or rephrase. Low, Sonar 0. */
export function pickCommand(actions: ReadonlyMap<string, number>, targets: ReadonlyMap<string, number>): ToolType | typeof REPHRASE {
  const ranked = rankCommands(actions, targets);
  return ranked === REPHRASE
    ? REPHRASE
    : ranked[0]!;
}
