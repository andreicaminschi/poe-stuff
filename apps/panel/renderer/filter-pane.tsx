import { usePanel, type FilterSection } from "./store.ts";
import { usePicks } from "./use-picks.ts";

const SHOWN_PICKS = 5;

export const FILTER_TITLES: Readonly<Record<FilterSection, string>> = { category: "Category", seeder: "Seeder", tag: "Tag" };

function FilterSectionView({ section }: { readonly section: FilterSection }) {
  const { picked, toggle } = usePicks(section);
  const { clearSection, openDialog } = usePanel.getState();

  return (
    <div className="filter-section">
      <div className="filter-title">
        <span>{FILTER_TITLES[section]}</span>
        <span className="sp" />
        {picked.length === 0
          ? null
          : <button type="button" className="btn tiny ghost" onClick={() => clearSection(section)}>clear</button>}
      </div>
      {picked.slice(0, SHOWN_PICKS).map((name) => (
        <label key={name} className="check">
          <input type="checkbox" checked onChange={() => toggle(name)} />
          {name}
        </label>
      ))}
      <button type="button" className="btn tiny ghost" onClick={() => openDialog({ kind: "picker", section })}>
        {picked.length === 0
          ? "select"
          : "show more"}
      </button>
    </div>
  );
}

export function FilterPane() {
  return (
    <section className="col">
      <div className="head"><span>Filters</span></div>
      <div className="body filters">
        <FilterSectionView section="category" />
        <FilterSectionView section="seeder" />
        <FilterSectionView section="tag" />
      </div>
    </section>
  );
}
