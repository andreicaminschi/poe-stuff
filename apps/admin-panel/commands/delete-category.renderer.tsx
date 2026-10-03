import type { DeleteCategoryCommand } from "./delete-category.ts";

export const DeleteCategoryView = ({ command }: { readonly command: DeleteCategoryCommand }) => (
  <p>Delete the empty category <strong>{command.names.join(", ")}</strong>.</p>
);
