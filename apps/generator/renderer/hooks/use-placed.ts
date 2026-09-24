import { place } from "@poe/filter-style/place";
import type { Placed } from "@poe/filter-style/types";
import { useMemo } from "react";
import { useSession } from "../session-store.ts";
import { placeOptions } from "../utils/place-options.ts";

/** The selected category's items, placed on its ladder. */
export function usePlaced(): Placed | undefined {
  const items = useSession((state) => state.items);
  const catalog = useSession((state) => state.catalog);
  const config = useSession((state) => state.config);
  const category = useSession((state) => state.category);

  return useMemo(() => {
    if (catalog === undefined || config === undefined || category === undefined) return undefined;

    const mine = items.filter((item) => item.category === category);
    return place(mine, placeOptions(config, category, catalog.categories[category]));
  }, [items, catalog, config, category]);
}
