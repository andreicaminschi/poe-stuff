import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { buildSuggestions, type Suggestion } from "./build-suggestions.ts";
import { readSeederName } from "../seeder-key.ts";
import { usePanel } from "./store.ts";

const GROUP_TITLES: Readonly<Record<Suggestion["kind"], string>> = {
  search: "Search",
  category: "Categories",
  seeder: "Seeders",
};

export function Omnibar() {
  const loaded = usePanel((state) => state.loaded);
  const pickedCategories = usePanel((state) => state.pickedCategories);
  const pickedSeeders = usePanel((state) => state.pickedSeeders);
  const query = usePanel((state) => state.query);
  const store = usePanel.getState();
  const toggleCategory = (name: string) => store.goToItems(() => store.toggleCategory(name));
  const dropSeeder = (key: string) => store.goToItems(() => store.dropSeeder(key));
  const dropLastToken = () => store.goToItems(store.dropLastToken);
  const setQuery = (text: string) => store.goToItems(() => store.setQuery(text));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => (loaded === undefined
      ? []
      : buildSuggestions(loaded.categories, loaded.items, loaded.itemCounts, { categories: pickedCategories, seeders: pickedSeeders, query })),
    [loaded, pickedCategories, pickedSeeders, query],
  );
  const shown = Math.min(highlight, suggestions.length - 1);

  const choose = (suggestion: Suggestion) => {
    store.goToItems(() => {
      if (suggestion.kind === "category") store.toggleCategory(suggestion.label);
      if (suggestion.kind === "seeder") store.pickSeeder(suggestion.key);
      if (suggestion.kind !== "search") store.setQuery("");
    });
    setHighlight(0);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const size = Math.max(suggestions.length, 1);
    if (event.key === "ArrowDown") setHighlight((shown + 1) % size);
    if (event.key === "ArrowUp") setHighlight((shown - 1 + size) % size);
    if (event.key === "Escape") setOpen(false);
    if (event.key === "Backspace" && query === "") dropLastToken();
    if (event.key === "Enter" && suggestions[shown] !== undefined) choose(suggestions[shown]);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") event.preventDefault();
  };

  return (
    <div className="omni-wrap">
      <div className="omni" onClick={() => input.current?.focus()}>
        {pickedCategories.map((name) => (
          <span className="token cat" key={`c ${name}`}>
            <span className="k">category:</span>
            {name}
            <button type="button" aria-label="Remove" onClick={() => toggleCategory(name)}>×</button>
          </span>
        ))}
        {pickedSeeders.map((key) => (
          <span className="token" key={`s ${key}`}>
            <span className="k">seeder:</span>
            {readSeederName(key)}
            <button type="button" aria-label="Remove" onClick={() => dropSeeder(key)}>×</button>
          </span>
        ))}
        <input
          ref={input}
          value={query}
          placeholder="Search items, or type a category or seeder name…"
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
        />
      </div>
      {open && suggestions.length > 0
        ? (
            <div className="omni-list">
              {suggestions.map((suggestion, at) => (
                <div key={`${suggestion.kind} ${suggestion.kind === "seeder"
                  ? suggestion.key
                  : suggestion.label}`}
                >
                  {at === 0 || suggestions[at - 1]?.kind !== suggestion.kind
                    ? <div className="grp">{GROUP_TITLES[suggestion.kind]}</div>
                    : null}
                  <div
                    className={at === shown
                      ? "opt hi"
                      : "opt"}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(suggestion);
                    }}
                  >
                    <span>{suggestion.label}</span>
                    {suggestion.kind === "seeder"
                      ? (
                          <span className="in">{`in ${suggestion.category}`}</span>
                        )
                      : null}
                    <span className="n">{suggestion.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        : null}
    </div>
  );
}
