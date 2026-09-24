import { useMemo, useState } from "react";
import { useCategory } from "../hooks/use-category.ts";
import { useSession } from "../session-store.ts";

/** The category's want-to-see list: items shown whatever they are worth. */
export function WantedEditor() {
  const category = useCategory();
  const items = useSession((state) => state.items);
  const addWanted = useSession((state) => state.addWanted);
  const removeWanted = useSession((state) => state.removeWanted);
  const [draft, setDraft] = useState("");
  const key = category?.key;

  const names = useMemo(
    () => [...new Set(items.filter((item) => item.category === key).map((item) => item.name))].sort(),
    [items, key],
  );
  if (category === undefined) return null;

  const { wanted } = category.config;
  const known = names.includes(draft) && !wanted.includes(draft);
  const add = () => {
    if (!known) return;
    addWanted(draft);
    setDraft("");
  };

  return (
    <div className="editor">
      <p className="label">Want to see</p>
      {wanted.length === 0 ? <p className="note">Nothing on the list.</p> : null}
      {wanted.map((name) => (
        <div className="wanted" key={name}>
          <span>{name}</span>
          <button type="button" className="btn icon" aria-label={`Remove ${name}`} onClick={() => removeWanted(name)}>
            ×
          </button>
        </div>
      ))}
      <div className="adder">
        <input
          type="text"
          list="wanted-names"
          placeholder="Item name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
        />
        <button type="button" className="btn" disabled={!known} onClick={add}>
          Add
        </button>
        <datalist id="wanted-names">
          {names.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
