import { useState } from "react";
import { DialogFrame } from "./dialog-frame.tsx";
import { usePanel } from "./store.ts";

type NewSeederDialogProps = { readonly category: string };

export function NewSeederDialog({ category: initialCategory }: NewSeederDialogProps) {
  const categories = usePanel((state) => state.view?.state.categories);
  const dispatch = usePanel((state) => state.dispatch);
  const [category, setCategory] = useState(initialCategory);
  const [name, setName] = useState("");
  const seeder = name.trim();

  return (
    <DialogFrame title="New seeder" confirm="Create" disabled={seeder === ""} onConfirm={() => dispatch({ type: "createSeeder", category, seeder })}>
      <label>
        Category
        <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
          {Object.keys(categories ?? {}).sort().map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
      </label>
      <label>
        Name
        <input className="field" autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      </label>
    </DialogFrame>
  );
}
