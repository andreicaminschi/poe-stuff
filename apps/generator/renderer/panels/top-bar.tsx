import { useSession } from "../session-store.ts";
import { topCategories } from "../utils/top-categories.ts";

/** The category tabs, and the buttons that save the config and write the filter. */
export function TopBar() {
  const items = useSession((state) => state.items);
  const catalog = useSession((state) => state.catalog);
  const selected = useSession((state) => state.category);
  const dirty = useSession((state) => state.config !== state.saved);
  const busy = useSession((state) => state.busy);
  const selectCategory = useSession((state) => state.selectCategory);
  const setScreen = useSession((state) => state.setScreen);
  const query = useSession((state) => state.query);
  const setQuery = useSession((state) => state.setQuery);
  const saveConfig = useSession((state) => state.saveConfig);
  const writeFilter = useSession((state) => state.writeFilter);

  return (
    <div className="bar">
      <button type="button" className="btn primary" onClick={() => setScreen("simulate")}>
        Simulate
      </button>
      <span className="label">Categories</span>
      {topCategories(items).map((key) => (
        <button
          type="button"
          key={key}
          className={key === selected ? "ctab on" : "ctab"}
          onClick={() => selectCategory(key)}
        >
          {catalog?.categories[key]?.name ?? key}
        </button>
      ))}
      <span className="sp" />
      <input
        type="search"
        className="search"
        placeholder="Search items"
        aria-label="Search items"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="button" className="btn" disabled={!dirty || busy} onClick={() => void saveConfig()}>
        Save config
      </button>
      <button type="button" className="btn primary" disabled={busy} onClick={() => void writeFilter()}>
        Write filter
      </button>
    </div>
  );
}
