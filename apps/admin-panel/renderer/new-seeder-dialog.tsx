import { useState } from "react";
import type { Category } from "../types.ts";
import { findFreeName } from "../find-free-name.ts";
import { listSeederNames } from "../panel-state.ts";
import { usePanel } from "./store.ts";

/** Asks for a new seeder's name and category. A name taken in any category becomes `Name (2)`. */
export function NewSeederDialog({
  categories,
  initialCategory,
}: {
  readonly categories: readonly Category[];
  readonly initialCategory: string;
}) {
  const { createSeeder, closeDialog } = usePanel.getState();
  const [name, setName] = useState("");
  const [categoryName, setCategoryName] = useState(initialCategory);
  const category = categories.find((at) => at.name === categoryName);
  const trimmed = name.trim();
  const savedName = findFreeName(trimmed, listSeederNames(categories));
  const ready = trimmed !== "" && category !== undefined;

  return (
    <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <form
        className="modal small"
        role="dialog"
        aria-modal="true"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) createSeeder(categoryName, savedName);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") closeDialog();
        }}
      >
        <div className="modal-head"><h3>New seeder</h3></div>
        <div className="modal-body dialog-fields">
          <input type="text" className="wide" value={name} placeholder="Name" autoFocus onChange={(event) => setName(event.target.value)} />
          <select className="wide" value={categoryName} aria-label="Category" onChange={(event) => setCategoryName(event.target.value)}>
            {categories.map((at) => <option key={at.name} value={at.name}>{at.name}</option>)}
          </select>
          {trimmed !== "" && savedName !== trimmed
            ? <p className="faint">{`Saved as ${savedName}`}</p>
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
