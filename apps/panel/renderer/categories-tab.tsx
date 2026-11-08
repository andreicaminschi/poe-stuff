import { useState } from "react";
import type { CSSProperties } from "react";
import { CategoryList } from "./category-list.tsx";
import { ColumnHandle } from "./column-handle.tsx";
import { readSavedWidth, type ColumnSize } from "./read-saved-width.ts";
import { SeederEditor } from "./seeder-editor.tsx";
import { SeederList } from "./seeder-list.tsx";

const CATEGORIES_SIZE: ColumnSize = { key: "panel.categoriesPercent", fallback: 20, min: 15, max: 25 };
const SEEDERS_SIZE: ColumnSize = { key: "panel.seedersPercent", fallback: 20, min: 15, max: 25 };

export function CategoriesTab() {
  const [categoriesWidth, setCategoriesWidth] = useState(() => readSavedWidth(CATEGORIES_SIZE));
  const [seedersWidth, setSeedersWidth] = useState(() => readSavedWidth(SEEDERS_SIZE));
  const widths = {
    "--categories-width": `${String(categoriesWidth)}%`,
    "--seeders-width": `${String(seedersWidth)}%`,
  } as CSSProperties;

  return (
    <main className="cols categories" style={widths}>
      <CategoryList />
      <ColumnHandle side="left" size={CATEGORIES_SIZE} width={categoriesWidth} onResize={setCategoriesWidth} />
      <SeederList />
      <ColumnHandle side="left" size={SEEDERS_SIZE} width={seedersWidth} onResize={setSeedersWidth} />
      <SeederEditor />
    </main>
  );
}
