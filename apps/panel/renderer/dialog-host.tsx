import { ConfirmDialog } from "./confirm-dialog.tsx";
import { MergeDialog } from "./merge-dialog.tsx";
import { NewCategoryDialog } from "./new-category-dialog.tsx";
import { NewSeederDialog } from "./new-seeder-dialog.tsx";
import { RenameDialog } from "./rename-dialog.tsx";
import { usePanel } from "./store.ts";

export function DialogHost() {
  const dialog = usePanel((state) => state.dialog);
  if (dialog === undefined) return null;
  switch (dialog.kind) {
    case "newCategory":
      return <NewCategoryDialog />;
    case "newSeeder":
      return <NewSeederDialog category={dialog.category} />;
    case "rename":
      return <RenameDialog target={dialog.target} name={dialog.name} />;
    case "merge":
      return <MergeDialog category={dialog.category} />;
    case "confirm":
      return <ConfirmDialog message={dialog.message} command={dialog.command} />;
  }
}
