import type { ReactElement } from "react";
import type { Command } from "../commands.ts";
import { CreateCategoryView } from "../commands/create-category.renderer.tsx";
import { CreateSeederView } from "../commands/create-seeder.renderer.tsx";
import { DeleteCategoryView } from "../commands/delete-category.renderer.tsx";
import { DeleteSeederView } from "../commands/delete-seeder.renderer.tsx";
import { DeleteSeedersView } from "../commands/delete-seeders.renderer.tsx";
import { MergeCategoryView } from "../commands/merge-category.renderer.tsx";
import { MoveSeederView } from "../commands/move-seeder.renderer.tsx";
import { MoveSeedersView } from "../commands/move-seeders.renderer.tsx";
import { ReplaceSeederView } from "../commands/replace-seeder.renderer.tsx";
import { SaveView } from "../commands/save.renderer.tsx";
import { UndoView } from "../commands/undo.renderer.tsx";
import { UpdateSeederView } from "../commands/update-seeder.renderer.tsx";
import { UpdateItemsView } from "../commands/update-items.renderer.tsx";
import { UpdateSeedersView } from "../commands/update-seeders.renderer.tsx";

type CommandViews = {
  readonly [K in Command["type"]]: (props: { readonly command: Extract<Command, { readonly type: K }> }) => ReactElement;
};

export const commandViews: CommandViews = {
  save: SaveView,
  createCategory: CreateCategoryView,
  deleteCategory: DeleteCategoryView,
  createSeeder: CreateSeederView,
  updateSeeder: UpdateSeederView,
  replaceSeeder: ReplaceSeederView,
  moveSeeder: MoveSeederView,
  deleteSeeder: DeleteSeederView,
  updateSeeders: UpdateSeedersView,
  deleteSeeders: DeleteSeedersView,
  moveSeeders: MoveSeedersView,
  mergeCategory: MergeCategoryView,
  updateItems: UpdateItemsView,
  undo: UndoView,
};
