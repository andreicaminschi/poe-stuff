import { formatCondition } from "../renderer/format-condition.ts";
import type { SeederPatch } from "../types.ts";
import type { UpdateSeederCommand } from "./update-seeder.ts";

/** Lists one side of a patch, one line per field. */
export function PatchLines({ label, patch }: { readonly label: string; readonly patch: SeederPatch | undefined }) {
  if (patch === undefined) return null;

  return (
    <>
      {(patch.knownItems ?? []).length === 0
        ? null
        : <li>{`${label} known items: ${(patch.knownItems ?? []).join(", ")}`}</li>}
      {(patch.tags ?? []).length === 0
        ? null
        : <li>{`${label} tags: ${(patch.tags ?? []).join(", ")}`}</li>}
      {Object.entries(patch.conditions ?? {}).map(([key, values]) => <li key={key} className="mono">{`${label} ${formatCondition(key, values)}`}</li>)}
    </>
  );
}

export const UpdateSeederView = ({ command }: { readonly command: UpdateSeederCommand }) => (
  <>
    <p>Update seeder <strong>{command.seeder}</strong> in <strong>{command.category}</strong>:</p>
    <ul>
      <PatchLines label="Add" patch={command.add} />
      <PatchLines label="Remove" patch={command.remove} />
    </ul>
  </>
);
