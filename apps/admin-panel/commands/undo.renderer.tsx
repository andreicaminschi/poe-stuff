import type { UndoCommand } from "./undo.ts";

export const UndoView = (_props: { readonly command: UndoCommand }) => <p>Undo the agent's last edit.</p>;
