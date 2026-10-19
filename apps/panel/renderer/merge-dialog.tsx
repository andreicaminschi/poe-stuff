import { useState } from "react";
import { DialogFrame } from "./dialog-frame.tsx";
import { usePanel } from "./store.ts";

type MergeDialogProps = { readonly category: string };

export function MergeDialog({ category }: MergeDialogProps) {
  const categories = usePanel((state) => state.view?.state.categories);
  const dispatch = usePanel((state) => state.dispatch);
  const others = Object.keys(categories ?? {}).filter((entry) => entry !== category).sort();
  const [into, setInto] = useState(others[0] ?? "");

  return (
    <DialogFrame title={`Merge ${category}`} confirm="Merge" disabled={into === ""} onConfirm={() => dispatch({ type: "mergeCategory", category, into })}>
      <label>
        Into
        <select className="field" value={into} onChange={(event) => setInto(event.target.value)}>
          {others.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
        </select>
      </label>
    </DialogFrame>
  );
}
