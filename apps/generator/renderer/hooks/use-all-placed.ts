import { place } from "@poe/filter-style/place";
import type { Palette, Placed } from "@poe/filter-style/types";
import { useMemo } from "react";
import { useSession } from "../session-store.ts";
import { categoryConfig } from "../utils/category-config.ts";
import { placeOptions } from "../utils/place-options.ts";
import { topCategories } from "../utils/top-categories.ts";

export type PlacedCategory = {
  readonly key: string;
  readonly name: string;
  readonly palette: Palette;
  readonly placed: Placed;
};

/** Every category's items, placed on its own ladder. */
export function useAllPlaced(): readonly PlacedCategory[] {
  const items = useSession((state) => state.items);
  const catalog = useSession((state) => state.catalog);
  const config = useSession((state) => state.config);

  return useMemo(() => {
    if (catalog === undefined || config === undefined) return [];

    return topCategories(items).map((key) => ({
      key,
      name: catalog.categories[key]?.name ?? key,
      palette: categoryConfig(config, key).palette,
      placed: place(
        items.filter((item) => item.category === key),
        placeOptions(config, key, catalog.categories[key]),
      ),
    }));
  }, [items, catalog, config]);
}
