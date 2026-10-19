import { usePanel } from "./store.ts";

export function FilterChips() {
  const pickedCategories = usePanel((state) => state.pickedCategories);
  const pickedSeeders = usePanel((state) => state.pickedSeeders);
  const toggleCategory = usePanel((state) => state.toggleCategory);
  const toggleSeeder = usePanel((state) => state.toggleSeeder);
  const clearFilters = usePanel((state) => state.clearFilters);
  if (pickedCategories.length === 0 && pickedSeeders.length === 0) return null;

  return (
    <div className="chips">
      {pickedCategories.map((name) => (
        <span key={`category:${name}`} className="chip">
          <span className="kind">category</span>
          {name}
          <button type="button" className="btn tiny ghost" title={`Remove ${name}`} onClick={() => toggleCategory(name)}>×</button>
        </span>
      ))}
      {pickedSeeders.map((name) => (
        <span key={`seeder:${name}`} className="chip">
          <span className="kind">seeder</span>
          {name}
          <button type="button" className="btn tiny ghost" title={`Remove ${name}`} onClick={() => toggleSeeder(name)}>×</button>
        </span>
      ))}
      <button type="button" className="btn tiny" onClick={clearFilters}>Clear</button>
    </div>
  );
}
