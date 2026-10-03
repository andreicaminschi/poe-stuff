import type { CreateCategoryCommand } from "./create-category.ts";

export const CreateCategoryView = ({ command }: { readonly command: CreateCategoryCommand }) => (
  <p>Create category <strong>{command.names.join(", ")}</strong>.</p>
);
