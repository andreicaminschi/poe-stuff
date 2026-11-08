import { useMemo } from "react";
import { listItemRows } from "./list-item-rows.ts";
import { listScopedSeeders } from "./list-scoped-seeders.ts";
import { matchesSearch } from "./matches-search.ts";
import { usePanel } from "./store.ts";

export function SeederList() {
  const state = usePanel((store) => store.view?.state);
  const pickedCategories = usePanel((store) => store.pickedCategories);
  const search = usePanel((store) => store.searchQuery);
  const selected = usePanel((store) => store.selectedSeeder);
  const { selectSeeder, openDialog } = usePanel.getState();
  const rows = useMemo(() => (state === undefined
    ? []
    : listItemRows(state)), [state]);
  if (state === undefined) return null;
  const producing = new Set(rows.filter((row) => matchesSearch(row, search)).flatMap((row) => row.seeders));
  const seeders = listScopedSeeders(state, pickedCategories, [])
    .filter(({ name }) => search.trim() === "" || producing.has(name));
  const newCategory = pickedCategories[0] ?? Object.keys(state.categories)[0];

  return (
    <section className="col">
      <div className="head">
        <span>Seeders</span>
        <span className="sp" />
        <button
          type="button"
          className="btn tiny"
          disabled={newCategory === undefined}
          onClick={() => newCategory === undefined || openDialog({ kind: "newSeeder", category: newCategory })}
        >
          + New seeder
        </button>
      </div>
      <div className="body">
        {seeders.length === 0
          ? <p className="empty">No seeders.</p>
          : null}
        {seeders.map(({ name }) => (
          <div
            key={name}
            className={name === selected
              ? "row on"
              : "row"}
            onClick={() => selectSeeder(name)}
          >
            <span className="name">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
