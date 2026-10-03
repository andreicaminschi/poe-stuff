import { describeSeederTargets } from "../seeder-targets.ts";
import type { MoveSeedersCommand } from "./move-seeders.ts";

export const MoveSeedersView = ({ command }: { readonly command: MoveSeedersCommand }) => (
  <p>Move <strong>{describeSeederTargets(command.targets)}</strong> to <strong>{command.toCategory}</strong>.</p>
);
