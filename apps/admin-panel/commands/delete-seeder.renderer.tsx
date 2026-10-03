import type { DeleteSeederCommand } from "./delete-seeder.ts";

export const DeleteSeederView = ({ command }: { readonly command: DeleteSeederCommand }) => (
  <p>Delete seeder <strong>{command.seeder}</strong> from <strong>{command.category}</strong>.</p>
);
