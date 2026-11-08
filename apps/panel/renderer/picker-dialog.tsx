import { useState } from "react";
import { DialogFrame } from "./dialog-frame.tsx";
import { FILTER_TITLES } from "./filter-pane.tsx";
import { listFilterOptions } from "./list-filter-options.ts";
import { usePanel, type FilterSection } from "./store.ts";
import { usePicks } from "./use-picks.ts";

/** A searchable checkbox list over one filter section. Checked rows come first, in the order taken on open. */
export function PickerDialog({ section }: { readonly section: FilterSection }) {
  const state = usePanel((store) => store.view?.state);
  const { picked, toggle } = usePicks(section);
  const [ordered] = useState(() => {
    const options = state === undefined
      ? []
      : listFilterOptions(state, section);
    return [...options.filter((option) => picked.includes(option)), ...options.filter((option) => !picked.includes(option))];
  });
  const [query, setQuery] = useState("");
  const lowered = query.trim().toLowerCase();
  const options = ordered.filter((option) => option.toLowerCase().includes(lowered));

  return (
    <DialogFrame title={`Pick ${FILTER_TITLES[section].toLowerCase()}`} confirm="Done" disabled={false} onConfirm={() => Promise.resolve(true)}>
      <input className="search" autoFocus placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="picker-list">
        {options.length === 0
          ? <p className="empty">Nothing matches.</p>
          : null}
        {options.map((option) => (
          <label key={option} className="check">
            <input type="checkbox" checked={picked.includes(option)} onChange={() => toggle(option)} />
            {option}
          </label>
        ))}
      </div>
    </DialogFrame>
  );
}
