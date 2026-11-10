import { countTagSeederItems } from "./count-tag-seeder-items.ts";
import { usePanel } from "./store.ts";

export function TagSeederList() {
  const tagSeeders = usePanel((store) => store.view?.state.tagSeeders);
  const rows = usePanel((store) => store.itemRows);
  const pick = usePanel((store) => store.tagSeederPick);
  const search = usePanel((store) => store.tagSeederSearch);
  const { pickTagSeeder, setTagSeederSearch } = usePanel.getState();
  const counts = countTagSeederItems(rows);
  const query = search.trim().toLowerCase();
  const names = Object.keys(tagSeeders ?? {})
    .filter((name) => query === "" || name.toLowerCase().includes(query))
    .toSorted((left, right) => left.localeCompare(right));

  return (
    <section className="col">
      <div className="head">
        <span>Tag seeders</span>
        <span className="sp" />
        <button type="button" className="btn tiny" onClick={() => pickTagSeeder({ kind: "new" })}>+ New tag seeder</button>
      </div>
      <div className="head">
        <input className="search" placeholder="Search tag seeders" value={search} onChange={(event) => setTagSeederSearch(event.target.value)} />
      </div>
      <div className="body">
        {names.length === 0
          ? <p className="empty">No tag seeders.</p>
          : null}
        {names.map((name) => (
          <div
            key={name}
            className={pick?.kind === "stored" && pick.name === name
              ? "row on"
              : "row"}
            onClick={() => pickTagSeeder({ kind: "stored", name })}
          >
            <span className="name">{name}</span>
            <span className="count">{counts.get(name) ?? 0}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
