import { formatCondition } from "../renderer/format-condition.ts";
import type { ReplaceSeederCommand } from "./replace-seeder.ts";

export const ReplaceSeederView = ({ command }: { readonly command: ReplaceSeederCommand }) => (
  <>
    <p>
      Replace seeder <strong>{command.seeder}</strong> in <strong>{command.category}</strong>
      {command.with.name === command.seeder
        ? "."
        : <>, renamed to <strong>{command.with.name}</strong>.</>}
    </p>
    <ul>
      {Object.entries(command.with.conditions).map(([key, values]) => <li key={key} className="mono">{formatCondition(key, values)}</li>)}
    </ul>
  </>
);
