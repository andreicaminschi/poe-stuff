import { TIERS } from "@poe/filter-style/types";
import { useCategory } from "../hooks/use-category.ts";
import { useSession } from "../session-store.ts";
import { placeOptions } from "../utils/place-options.ts";

/** The floors this category is tiered by: the global Chaos floors, or its own stack sizes. */
export function FloorEditor() {
  const category = useCategory();
  const config = useSession((state) => state.config);
  const setFloor = useSession((state) => state.setFloor);
  if (category === undefined || config === undefined) return null;

  const options = placeOptions(config, category.key, category.record);
  const stack = options.tiering === "stack-size";

  return (
    <div className="editor">
      <p className="label">{stack ? `${category.name} · stack sizes` : "Floors · every Chaos category"}</p>
      <div className="floors">
        {TIERS.map((name) => (
          <label key={name}>
            <span>{name}</span>
            <input
              type="number"
              min={0}
              step="any"
              value={options.floors[name]}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= 0) setFloor(name, value);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
