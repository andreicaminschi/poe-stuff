import { useState } from "react";
import { DialogFrame } from "./dialog-frame.tsx";
import { usePanel } from "./store.ts";

export function NewCategoryDialog() {
  const dispatch = usePanel((state) => state.dispatch);
  const [name, setName] = useState("");
  const category = name.trim();

  return (
    <DialogFrame title="New category" confirm="Create" disabled={category === ""} onConfirm={() => dispatch({ type: "createCategory", category })}>
      <label>
        Name
        <input className="field" autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </label>
    </DialogFrame>
  );
}
