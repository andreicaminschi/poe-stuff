import type { ToolType } from "./commands.ts";

export const ACTIONS = ["create", "delete", "update", "move", "rephrase"] as const;
export const TARGETS = ["category", "seeder", "seeders", "items"] as const;

export type Action = (typeof ACTIONS)[number];
export type Target = (typeof TARGETS)[number];

/** Every tool as an action on a target. A pair missing here is no command. */
export const COMMAND_PARTS: { readonly [K in ToolType]: { readonly action: Exclude<Action, "rephrase">; readonly target: Target } } = {
  createCategory: { action: "create", target: "category" },
  deleteCategory: { action: "delete", target: "category" },
  mergeCategory: { action: "move", target: "category" },
  createSeeder: { action: "create", target: "seeder" },
  updateSeeder: { action: "update", target: "seeder" },
  deleteSeeder: { action: "delete", target: "seeder" },
  moveSeeder: { action: "move", target: "seeder" },
  updateSeeders: { action: "update", target: "seeders" },
  deleteSeeders: { action: "delete", target: "seeders" },
  moveSeeders: { action: "move", target: "seeders" },
  updateItems: { action: "update", target: "items" },
};
