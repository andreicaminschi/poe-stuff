import { VOCABULARY } from "@poe/agent-input/vocabulary";
import type { PanelState } from "@poe/panel-state/types";

/** Every category, seeder, item and condition name, once each. */
export function listKnownNames(state: PanelState | undefined): readonly string[] {
  if (state === undefined) return VOCABULARY.conditions;
  const categories = Object.entries(state.categories);
  const seederNames = categories.flatMap(([, category]) => Object.keys(category.seeders ?? {}));
  return [...new Set([...categories.map(([name]) => name), ...seederNames, ...Object.keys(state.items), ...VOCABULARY.conditions])];
}
