import type { Category } from "../types.ts";
import { EditSeederButton } from "./edit-seeder-button.tsx";
import { formatCondition } from "./format-condition.ts";
import { listUnknownKeys } from "./generate-items.ts";
import { formatSeederKey } from "./seeder-key.ts";
import { sortSeeders } from "./sort-seeders.ts";
import { usePanel } from "./store.ts";

export function SeederList({
  categories,
  itemCounts,
}: {
  readonly categories: readonly Category[];
  readonly itemCounts: ReadonlyMap<string, number>;
}) {
  const { showOnlySeeder } = usePanel.getState();
  const seeders = categories.flatMap((category) => sortSeeders(category.seeders).map((seeder) => ({ category, seeder })));

  if (seeders.length === 0) return <p className="empty">No seeders.</p>;

  return seeders.map(({ category, seeder }) => {
    const key = formatSeederKey(category.name, seeder.name);
    const unknown = listUnknownKeys(seeder);
    const count = itemCounts.get(key) ?? 0;
    const parts = [
      ...Object.entries(seeder.conditions)
        .filter(([conditionKey]) => !unknown.includes(conditionKey))
        .map(([conditionKey, values]) => formatCondition(conditionKey, values)),
      ...(seeder.knownItems === undefined || seeder.knownItems.length === 0
        ? []
        : [`Known items: ${seeder.knownItems.join(" | ")}`]),
      ...seeder.tags,
    ];

    return (
      <div className="sline" key={key} onClick={() => showOnlySeeder(key)}>
        <span className="line" title={[seeder.name, ...parts].join(", ")}>
          <strong>{seeder.name}</strong>
          {parts.length === 0
            ? ""
            : `, ${parts.join(", ")}`}
          {unknown.map((name) => <span className="bad" key={name}>{`, ${name}: unknown condition`}</span>)}
        </span>
        <EditSeederButton seederKey={key} />
        <span className="sp" />
        <span className="from">
          {category.name}
          {" "}
          ·
          {" "}
          {count}
          {" "}
          items
        </span>
      </div>
    );
  });
}
