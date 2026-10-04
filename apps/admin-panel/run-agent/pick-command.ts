import { COMMAND_PARTS } from "../command-parts.ts";
import type { ToolType } from "../commands.ts";
import { REPHRASE } from "../decision-options.ts";
import { topLabel } from "./load-encoder.ts";

/**
 * Rephrase when it is the top action. Otherwise the real command whose action and target
 * probabilities multiply highest, so an impossible pair never wins. Low, Sonar 1.
 */
export function pickCommand(actions: ReadonlyMap<string, number>, targets: ReadonlyMap<string, number>): ToolType | typeof REPHRASE {
  if (topLabel(actions) === "rephrase") return REPHRASE;

  return (Object.entries(COMMAND_PARTS) as [ToolType, { readonly action: string; readonly target: string }][])
    .map(([type, parts]) => [type, (actions.get(parts.action) ?? 0) * (targets.get(parts.target) ?? 0)] as const)
    .reduce((best, entry) => (entry[1] > best[1]
      ? entry
      : best))[0];
}
