import { formatCondition } from "@poe/panel-state/generate-items";
import type { Item } from "@poe/panel-state/types";
import { useState } from "react";
import { buildItemUpdate, toItemDraft } from "./build-item-update.ts";
import { ChipList } from "./chip-list.tsx";
import { DialogFrame } from "./dialog-frame.tsx";
import type { ItemRow } from "./list-item-rows.ts";
import { PriceList } from "./price-list.tsx";
import { usePanel } from "./store.ts";

type DraftProps = { readonly row: ItemRow; readonly item: Item };

function ItemDraftEditor({ row, item }: DraftProps) {
  const { dispatch, selectSeeder, setMode, closeDialog } = usePanel.getState();
  const [draft, setDraft] = useState(() => toItemDraft(item));
  const update = buildItemUpdate(item, draft);

  const editSeeder = (seeder: string): void => {
    selectSeeder(seeder);
    setMode("categories");
    closeDialog();
  };

  return (
    <DialogFrame
      title={row.name}
      confirm="Apply"
      disabled={!update.changed}
      onConfirm={() => dispatch({ type: "updateItem", item: row.key, add: update.add, remove: update.remove })}
    >
      <div className="editor">
        <div>
          <h3>Conditions</h3>
          {row.conditions.map((entry) => <div key={entry.condition} className="mono">{formatCondition(entry)}</div>)}
        </div>
        <div>
          <h3>Seeder</h3>
          {row.seeders.map((seeder) => (
            <div key={seeder} className="condition-head">
              <span>{`${row.category} / ${seeder}`}</span>
              <span className="sp" />
              <button type="button" className="btn tiny" onClick={() => editSeeder(seeder)}>Edit seeder</button>
            </div>
          ))}
        </div>
        <div>
          <h3>Names</h3>
          <div className="chips">{row.names.map((name) => <span key={name} className="chip outline">{name}</span>)}</div>
        </div>
        <div>
          <h3>Seeder tags</h3>
          <div className="chips">{row.seederTags.map((tag) => <span key={tag} className="chip outline">{tag}</span>)}</div>
        </div>
        <div>
          <h3>Tags</h3>
          <ChipList values={draft.tags} placeholder="Add tag" onChange={(tags) => setDraft({ ...draft, tags })} />
        </div>
        <div>
          <h3>Prices</h3>
          <PriceList prices={draft.prices} onChange={(prices) => setDraft({ ...draft, prices })} />
        </div>
      </div>
    </DialogFrame>
  );
}

export function ItemDialog({ itemKey }: { readonly itemKey: string }) {
  const state = usePanel((store) => store.view?.state);
  const rows = usePanel((store) => store.itemRows);
  const row = rows.find((entry) => entry.key === itemKey);
  const item = state?.items[itemKey] ?? {};

  if (row === undefined) {
    return (
      <DialogFrame title="Item" confirm="Close" disabled={false} onConfirm={() => Promise.resolve(true)}>
        <p className="empty">This item is no longer generated.</p>
      </DialogFrame>
    );
  }
  return <ItemDraftEditor key={JSON.stringify(item)} row={row} item={item} />;
}
