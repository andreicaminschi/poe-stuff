import { readSeederName } from "../seeder-key.ts";
import { usePanel } from "./store.ts";

/** The applied filters, each removable. */
export function FilterChips() {
  const pickedCategories = usePanel((state) => state.pickedCategories);
  const pickedSeeders = usePanel((state) => state.pickedSeeders);
  const { toggleCategory, dropSeeder, guard } = usePanel.getState();

  if (pickedCategories.length === 0 && pickedSeeders.length === 0) return null;

  return (
    <div className="chips-bar">
      {pickedCategories.map((name) => (
        <span className="token cat" key={`c ${name}`}>
          <span className="k">category:</span>
          {name}
          <button type="button" aria-label="Remove" onClick={() => guard(() => toggleCategory(name))}>×</button>
        </span>
      ))}
      {pickedSeeders.map((key) => (
        <span className="token" key={`s ${key}`}>
          <span className="k">seeder:</span>
          {readSeederName(key)}
          <button type="button" aria-label="Remove" onClick={() => guard(() => dropSeeder(key))}>×</button>
        </span>
      ))}
    </div>
  );
}
