import { listReferencingSeeders } from "./list-referencing-seeders.ts";
import { listScopedSeeders } from "./list-scoped-seeders.ts";
import { listSeeders } from "./list-seeders.ts";
import { usePanel } from "./store.ts";

export function ItemList() {
  const state = usePanel((store) => store.view?.state);
  const pickedCategories = usePanel((store) => store.pickedCategories);
  const pickedSeeders = usePanel((store) => store.pickedSeeders);
  const query = usePanel((store) => store.itemQuery);
  const selected = usePanel((store) => store.selectedItem);
  const { selectItem, setItemQuery } = usePanel.getState();
  if (state === undefined) return null;

  const allSeeders = listSeeders(state);
  const scoped = pickedCategories.length + pickedSeeders.length > 0;
  const scopedItems = new Set(listScopedSeeders(state, pickedCategories, pickedSeeders).flatMap(({ seeder }) => Object.keys(seeder.knownItems ?? {})));
  const lowered = query.trim().toLowerCase();
  const items = Object.entries(state.items)
    .filter(([name]) => !scoped || scopedItems.has(name))
    .filter(([name]) => name.toLowerCase().includes(lowered))
    .sort(([left], [right]) => left.localeCompare(right));

  return (
    <section className="col">
      <div className="head">
        <input className="search" placeholder="Search items" value={query} onChange={(event) => setItemQuery(event.target.value)} />
        <span className="count">{items.length}</span>
      </div>
      <div className="body">
        {items.length === 0
          ? <p className="empty">No items.</p>
          : null}
        {items.map(([name, item]) => (
          <div
            key={name}
            className={name === selected
              ? "row on"
              : "row"}
            onClick={() => selectItem(name)}
          >
            <span className="name">{name}</span>
            <span className="count">{`${String(Object.keys(item.tags ?? {}).length)}t · ${String(listReferencingSeeders(allSeeders, name).length)}s`}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
