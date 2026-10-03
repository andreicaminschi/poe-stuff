import type { MoveSeederCommand } from "./move-seeder.ts";

export const MoveSeederView = ({ command }: { readonly command: MoveSeederCommand }) => (
  <p>
    Move seeder <strong>{command.seeder}</strong> from <strong>{command.category}</strong> to <strong>{command.toCategory}</strong>.
  </p>
);
