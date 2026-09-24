import { HIDDEN } from "@poe/filter-style/types";
import { useMemo, useRef, useState } from "react";
import { GroundBeam } from "../components/ground-beam.tsx";
import { GroundLabel } from "../components/ground-label.tsx";
import { useSession } from "../session-store.ts";
import { categoryPlans } from "../utils/category-plans.ts";
import { randomLoot, valuableLoot } from "../utils/generate-loot.ts";
import { lootPool, type Loot } from "../utils/loot-pool.ts";
import { measureText } from "../utils/measure-text.ts";
import { pileLabels, type Piled } from "../utils/pile-labels.ts";

/** A patch of floor that drops loot and draws it the way the filter would. */
export function SimulateScreen() {
  const items = useSession((state) => state.items);
  const catalog = useSession((state) => state.catalog);
  const config = useSession((state) => state.config);
  const setScreen = useSession((state) => state.setScreen);
  const floor = useRef<HTMLDivElement>(null);
  const [piled, setPiled] = useState<readonly Piled[]>([]);

  const pool = useMemo(
    () => (catalog === undefined || config === undefined ? [] : lootPool(categoryPlans(items, catalog.categories, config))),
    [items, catalog, config],
  );

  const drop = async (make: (pool: readonly Loot[]) => readonly Loot[]) => {
    await document.fonts.load("small-caps 20px Gelasio");
    const box = floor.current;
    if (box === null) return;
    setPiled(pileLabels(make(pool), box.clientWidth, box.clientHeight, measureText));
  };

  const hidden = piled.filter((one) => one.bucket === HIDDEN).length;

  return (
    <div className="simulate">
      <div className="simbar">
        <button type="button" className="btn" onClick={() => setScreen("tiers")}>
          ← Tiers
        </button>
        <span className="label">Simulate</span>
        <span className="sp" />
        <span className="count">{piled.length === 0 ? "" : `${piled.length} dropped · ${hidden} hidden`}</span>
        <button type="button" className="btn" onClick={() => void drop(randomLoot)}>
          Generate loot
        </button>
        <button type="button" className="btn primary" onClick={() => void drop(valuableLoot)}>
          Generate valuable loot
        </button>
      </div>
      <div className="floor" ref={floor}>
        {piled.length === 0 ? <div className="hint">Generate some loot to see how it drops.</div> : null}
        {piled.map((one, at) => (
          <GroundBeam key={`beam-${at}`} drop={one} />
        ))}
        {piled.map((one, at) => (
          <GroundLabel key={`label-${at}`} drop={one} />
        ))}
      </div>
    </div>
  );
}
