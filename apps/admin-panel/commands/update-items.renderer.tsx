import { PatchLines } from "./update-seeder.renderer.tsx";
import type { UpdateItemsCommand } from "./update-items.ts";

export const UpdateItemsView = ({ command }: { readonly command: UpdateItemsCommand }) => (
  <>
    <p>Update <strong>{command.items.join(", ")}</strong>:</p>
    <ul>
      <PatchLines label="Add" patch={command.add} />
      <PatchLines label="Remove" patch={command.remove} />
    </ul>
  </>
);
