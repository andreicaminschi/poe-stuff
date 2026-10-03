import { describeSeederTargets } from "../seeder-targets.ts";
import type { DeleteSeedersCommand } from "./delete-seeders.ts";

export const DeleteSeedersView = ({ command }: { readonly command: DeleteSeedersCommand }) => (
  <p>Delete <strong>{describeSeederTargets(command.targets)}</strong>.</p>
);
