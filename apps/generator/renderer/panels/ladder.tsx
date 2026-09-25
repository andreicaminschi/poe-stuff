import { tierStyle } from "@poe/filter-style/tier-style";
import { HIDDEN, TIERS, UNPRICED, WANT, type BucketName } from "@poe/filter-style/types";
import { Rung } from "../components/rung.tsx";
import { useCategory } from "../hooks/use-category.ts";
import { usePlaced } from "../hooks/use-placed.ts";
import { useSession } from "../session-store.ts";
import { placeOptions } from "../utils/place-options.ts";
import { span } from "../utils/span.ts";

/** The category's tiers, each with a switch, its range, its size and how many items it holds. */
export function Ladder() {
  const category = useCategory();
  const placed = usePlaced();
  const config = useSession((state) => state.config);
  const selected = useSession((state) => state.bucket);
  const selectBucket = useSession((state) => state.selectBucket);
  const toggleTier = useSession((state) => state.toggleTier);
  if (category === undefined || placed === undefined || config === undefined) return null;

  const options = placeOptions(config, category.key, category.record);
  const unit = options.tiering === "stack-size" ? " stack" : "c";
  const { palette, disabled } = category.config;
  const counts = new Map<BucketName, number>();
  for (const one of placed.placed) counts.set(one.bucket, (counts.get(one.bucket) ?? 0) + 1);

  const rangeOf = (name: BucketName): string => {
    const bucket = placed.ladder.find((one) => one.name === name);
    return bucket === undefined ? "" : span(bucket, unit);
  };

  return (
    <div className="ladder">
      <Rung name="All" range="every tier" count={placed.placed.length} selected={selected === null} onSelect={() => selectBucket(null)} />
      {TIERS.map((name) => {
        const enabled = !disabled.includes(name);
        return (
          <Rung
            key={name}
            name={name}
            range={enabled ? rangeOf(name) : `off · ${options.floors[name]}${unit}`}
            size={tierStyle(palette, name).size}
            count={counts.get(name) ?? 0}
            selected={selected === name}
            enabled={enabled}
            onSelect={() => selectBucket(name)}
            onToggle={() => toggleTier(name)}
          />
        );
      })}
      <Rung name={WANT} range="manual list" size="S" count={counts.get(WANT) ?? 0} selected={selected === WANT} onSelect={() => selectBucket(WANT)} />
      <Rung name={UNPRICED} range="flagged in taxonomy" size={tierStyle(palette, UNPRICED).size} count={counts.get(UNPRICED) ?? 0} selected={selected === UNPRICED} onSelect={() => selectBucket(UNPRICED)} />
      <Rung name={HIDDEN} range={rangeOf(HIDDEN)} size="XS" count={counts.get(HIDDEN) ?? 0} selected={selected === HIDDEN} onSelect={() => selectBucket(HIDDEN)} />
    </div>
  );
}
