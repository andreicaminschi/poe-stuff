import type { Category } from "../types.ts";
import { formatSeederKey } from "./seeder-key.ts";
import { sortSeeders } from "./sort-seeders.ts";
import { usePanel } from "./store.ts";

export function SeederList({
  categories,
  itemCounts,
  selected,
}: {
  readonly categories: readonly Category[];
  readonly itemCounts: ReadonlyMap<string, number>;
  readonly selected: string | undefined;
}) {
  const { selectSeeder } = usePanel.getState();
  const keys = categories.flatMap((category) => sortSeeders(category.seeders).map((seeder) => ({
    key: formatSeederKey(category.name, seeder.name),
    name: seeder.name,
  })));

  if (keys.length === 0) return <p className="empty">No seeders.</p>;

  return keys.map(({ key, name }) => (
    <div
      className={key === selected
        ? "sline on"
        : "sline"}
      key={key}
      onClick={() => selectSeeder(key)}
    >
      <span className="line"><strong>{name}</strong></span>
      <span className="sp" />
      <span className="from">{`${itemCounts.get(key) ?? 0} items`}</span>
    </div>
  ));
}
