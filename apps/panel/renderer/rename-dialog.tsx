import { useState } from "react";
import { DialogFrame } from "./dialog-frame.tsx";
import { usePanel } from "./store.ts";

type RenameDialogProps = { readonly target: "category" | "seeder"; readonly name: string };

export function RenameDialog({ target, name }: RenameDialogProps) {
  const dispatch = usePanel((state) => state.dispatch);
  const selectSeeder = usePanel((state) => state.selectSeeder);
  const selectedSeeder = usePanel((state) => state.selectedSeeder);
  const [text, setText] = useState(name);
  const to = text.trim();

  const rename = async (): Promise<boolean> => {
    const renamed = await dispatch({ type: "rename", target, name, to });
    if (renamed && target === "seeder" && selectedSeeder === name) selectSeeder(to);
    return renamed;
  };

  return (
    <DialogFrame title={`Rename ${target} ${name}`} confirm="Rename" disabled={to === "" || to === name} onConfirm={rename}>
      <label>
        New name
        <input className="field" autoFocus value={text} onChange={(event) => setText(event.target.value)} />
      </label>
    </DialogFrame>
  );
}
