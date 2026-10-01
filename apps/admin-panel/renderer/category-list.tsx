import { useMemo } from "react";
import { sortCategories } from "./sort-categories.ts";
import { usePanel } from "./store.ts";

export function CategoryList() {
  const loaded = usePanel((state) => state.loaded);
  const picked = usePanel((state) => state.pickedCategories);
  const { toggleCategory, guard, openDialog } = usePanel.getState();

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of loaded?.items ?? []) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return counts;
  }, [loaded]);

  return (
    <section className="col cats">
      <div className="head">
        <span className="label">Categories</span>
        <span className="sp" />
        <button type="button" className="btn tiny ghost" onClick={() => openDialog("category")}>+ New category</button>
      </div>
      <div className="body">
        {sortCategories(loaded?.categories ?? []).map((category) => {
          const seeders = category.seeders.length;

          return (
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
                {`${seeders} ${seeders === 1
                  ? "seeder"
                  : "seeders"} · ${itemCounts.get(category.name) ?? 0} items`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
