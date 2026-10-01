import { useMemo } from "react";
import { usePanel } from "./store.ts";

export function CategoryList() {
  const loaded = usePanel((state) => state.loaded);
  const picked = usePanel((state) => state.pickedCategories);
  const { toggleCategory, guard } = usePanel.getState();

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of loaded?.items ?? []) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return counts;
  }, [loaded]);

  return (
    <section className="col cats">
      <div className="head">
        <span className="label">Categories</span>
      </div>
      <div className="body">
        {(loaded?.categories ?? []).map((category) => (
          <div
            key={category.name}
            className={picked.includes(category.name)
              ? "cat on"
              : "cat"}
            onClick={() => guard(() => toggleCategory(category.name))}
          >
            <span>{category.name}</span>
            <span className="sp" />
            <span className="n">
              {category.seeders.length}
              {" "}
              {category.seeders.length === 1
                ? "seeder"
                : "seeders"}
              {" "}
              ·
              {" "}
              {itemCounts.get(category.name) ?? 0}
              {" "}
              items
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
