import type { MergeCategoryCommand } from "./merge-category.ts";

export const MergeCategoryView = ({ command }: { readonly command: MergeCategoryCommand }) => (
  <p>Merge <strong>{command.category}</strong> into <strong>{command.into}</strong>, then delete <strong>{command.category}</strong>.</p>
);
