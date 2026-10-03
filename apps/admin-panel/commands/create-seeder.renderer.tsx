import type { CreateSeederCommand } from "./create-seeder.ts";

export const CreateSeederView = ({ command }: { readonly command: CreateSeederCommand }) => (
  <p>Create seeder <strong>{command.names.join(", ")}</strong> in <strong>{command.category}</strong>.</p>
);
