import { useState } from "react";
import type { CSSProperties } from "react";
import { ColumnHandle } from "./column-handle.tsx";
import { readSavedWidth, type ColumnSize } from "./read-saved-width.ts";
import { TagSeederEditor } from "./tag-seeder-editor.tsx";
import { TagSeederList } from "./tag-seeder-list.tsx";

const LIST_SIZE: ColumnSize = { key: "panel.tagSeedersPercent", fallback: 25, min: 15, max: 40 };

export function TagSeedersTab() {
  const [listWidth, setListWidth] = useState(() => readSavedWidth(LIST_SIZE));
  const widths = { "--tag-seeders-width": `${String(listWidth)}%` } as CSSProperties;

  return (
    <main className="cols tag-seeders" style={widths}>
      <TagSeederList />
      <ColumnHandle side="left" size={LIST_SIZE} width={listWidth} onResize={setListWidth} />
      <TagSeederEditor />
    </main>
  );
}
