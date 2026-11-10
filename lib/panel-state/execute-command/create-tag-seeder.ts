import type { PanelState } from "../types.ts";
import { requireName } from "./find-seeder.ts";
import { patchTagSeeder } from "./patch-tag-seeder.ts";

export type CreateTagSeederCommand = {
  readonly type: "createTagSeeder";
  readonly name: string;
  readonly conditions: Readonly<Record<string, readonly string[]>>;
  readonly tags: readonly string[];
};

/** Adds a tag seeder. Throws when the name is blank or taken, or when it holds no condition or no tag. The name is taken as written. */
export function executeCreateTagSeeder(state: PanelState, command: CreateTagSeederCommand): PanelState {
  requireName(command.name, "tag seeder");
  if (state.tagSeeders[command.name] !== undefined) throw new Error(`Tag seeder "${command.name}" already exists.`);
  const tagSeeder = patchTagSeeder({ conditions: {}, tags: {} }, { conditions: command.conditions, tags: command.tags });
  return { ...state, tagSeeders: { ...state.tagSeeders, [command.name]: tagSeeder } };
}
