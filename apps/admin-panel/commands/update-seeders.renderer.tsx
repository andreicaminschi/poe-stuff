import { describeSeederTargets } from "../seeder-targets.ts";
import { PatchLines } from "./update-seeder.renderer.tsx";
import type { UpdateSeedersCommand } from "./update-seeders.ts";

export const UpdateSeedersView = ({ command }: { readonly command: UpdateSeedersCommand }) => (
  <>
    <p>Update <strong>{describeSeederTargets(command.targets)}</strong>:</p>
    <ul>
      <PatchLines label="Add" patch={command.add} />
      <PatchLines label="Remove" patch={command.remove} />
    </ul>
  </>
);
