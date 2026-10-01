import { useState } from "react";
import { usePanel } from "./store.ts";

/** Asks for a new category's name. A taken name cannot be created. */
export function NewCategoryDialog({ takenNames }: { readonly takenNames: readonly string[] }) {
  const { createCategory, closeDialog } = usePanel.getState();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const taken = takenNames.includes(trimmed);
  const ready = trimmed !== "" && !taken;

  return (
    <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <form
        className="modal small"
        role="dialog"
        aria-modal="true"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) createCategory(trimmed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeDialog();
        }}
      >
        <div className="modal-head"><h3>New category</h3></div>
        <div className="modal-body">
          <input type="text" className="wide" value={name} placeholder="Name" autoFocus onChange={(event) => setName(event.target.value)} />
          {taken
            ? <p className="err">{`A category called "${trimmed}" already exists.`}</p>
            : null}
        </div>
        <div className="modal-foot">
          <span className="sp" />
          <button type="button" className="btn" onClick={closeDialog}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!ready}>Create</button>
        </div>
      </form>
    </div>
  );
}
