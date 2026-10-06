import type { PanelState } from "../types.ts";
import { requireName } from "./find-seeder.ts";

export type CreateCategoryCommand = { readonly type: "createCategory"; readonly category: string };

/** Adds an empty category. Throws when the name is blank or taken. */
export function executeCreateCategory(state: PanelState, command: CreateCategoryCommand): PanelState {
  requireName(command.category, "category");
  if (state.categories[command.category] !== undefined) throw new Error(`Category "${command.category}" already exists.`);
  return { ...state, categories: { ...state.categories, [command.category]: {} } };
}
