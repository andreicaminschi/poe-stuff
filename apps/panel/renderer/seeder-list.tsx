import { listScopedSeeders } from "./list-scoped-seeders.ts";
import { usePanel } from "./store.ts";

export function SeederList() {
  const state = usePanel((store) => store.view?.state);
  const pickedCategories = usePanel((store) => store.pickedCategories);
  const pickedSeeders = usePanel((store) => store.pickedSeeders);
  const selected = usePanel((store) => store.selectedSeeder);
  const { selectSeeder, toggleSeeder, openDialog } = usePanel.getState();
  if (state === undefined) return null;
  const seeders = listScopedSeeders(state, pickedCategories, pickedSeeders);
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
        {seeders.map(({ category, name, seeder }) => (
          <div
            key={name}
            className={name === selected
              ? "row on"
              : "row"}
            onClick={() => selectSeeder(name)}
          >
            <span className="name">{name}</span>
            <span className="sub">{category}</span>
            <span className="count">
              {`${String(Object.keys(seeder.conditions ?? {}).length)}c · ${String(Object.keys(seeder.tags ?? {}).length)}t · ${String(Object.keys(seeder.knownItems ?? {}).length)}i`}
            </span>
            <button
              type="button"
              className={pickedSeeders.includes(name)
                ? "btn tiny primary"
                : "btn tiny ghost"}
              title="Filter by this seeder"
              onClick={(event) => {
                event.stopPropagation();
                toggleSeeder(name);
              }}
            >
              Filter
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
