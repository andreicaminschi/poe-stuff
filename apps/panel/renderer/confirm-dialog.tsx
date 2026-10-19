import type { Command } from "@poe/panel-state/execute-command";
import { DialogFrame } from "./dialog-frame.tsx";
import { usePanel } from "./store.ts";

type ConfirmDialogProps = { readonly message: string; readonly command: Command };

export function ConfirmDialog({ message, command }: ConfirmDialogProps) {
  const dispatch = usePanel((state) => state.dispatch);
  return (
    <DialogFrame title="Confirm" confirm="Confirm" disabled={false} onConfirm={() => dispatch(command)}>
      <p>{message}</p>
    </DialogFrame>
  );
}
