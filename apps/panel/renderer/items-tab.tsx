import { useState } from "react";
import type { CSSProperties } from "react";
import { ColumnHandle } from "./column-handle.tsx";
import { FilterPane } from "./filter-pane.tsx";
import { ItemList } from "./item-list.tsx";
import { readSavedWidth, type ColumnSize } from "./read-saved-width.ts";

const ITEMS_SIZE: ColumnSize = { key: "panel.itemsPercent", fallback: 70, min: 60, max: 75 };

export function ItemsTab() {
  const [itemsWidth, setItemsWidth] = useState(() => readSavedWidth(ITEMS_SIZE));
  const widths = { "--items-width": `${String(itemsWidth)}%` } as CSSProperties;

  return (
    <main className="cols items" style={widths}>
      <ItemList />
      <ColumnHandle side="left" size={ITEMS_SIZE} width={itemsWidth} onResize={setItemsWidth} />
      <FilterPane />
    </main>
  );
}
