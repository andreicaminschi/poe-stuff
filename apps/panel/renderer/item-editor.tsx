import type { Item } from "@poe/panel-state/types";
import { useState } from "react";
import { buildItemUpdate, toItemDraft } from "./build-item-update.ts";
import { ChipList } from "./chip-list.tsx";
import { listSeedersOfItem } from "./list-referencing-seeders.ts";
import { usePanel } from "./store.ts";

type DraftProps = { readonly name: string; readonly item: Item };

function ItemDraftEditor({ name, item }: DraftProps) {
  const state = usePanel((store) => store.view?.state);
  const busy = usePanel((store) => store.busy);
  const { dispatch, selectSeeder, setMode } = usePanel.getState();
  const [draft, setDraft] = useState(() => toItemDraft(item));
  const update = buildItemUpdate(item, draft);
  const seeders = state === undefined
    ? []
    : listSeedersOfItem(state, name);

  return (
    <div className="editor">
      <strong>{name}</strong>
      <div>
        <h3>Tags</h3>
        <ChipList values={draft.tags} placeholder="Add tag" onChange={(tags) => setDraft({ ...draft, tags })} />
      </div>
      <div>
        <h3>Known items</h3>
        <ChipList values={draft.knownItems} placeholder="Add item" onChange={(knownItems) => setDraft({ ...draft, knownItems })} />
      </div>
      <div className="actions">
        <button type="button" className="btn ghost" disabled={!update.changed} onClick={() => setDraft(toItemDraft(item))}>Reset</button>
        <button
          type="button"
          className="btn primary"
          disabled={busy || !update.changed}
          onClick={() => void dispatch({ type: "updateItems", items: [name], add: update.add, remove: update.remove })}
        >
          Apply
        </button>
      </div>
      <div>
        <h3>Seeders that name it</h3>
        {seeders.length === 0
          ? <p className="empty">None.</p>
          : null}
        {seeders.map((entry) => (
          <div
            key={entry.name}
            className="row"
            onClick={() => {
              selectSeeder(entry.name);
              setMode("seeders");
            }}
          >
            <span className="name">{entry.name}</span>
            <span className="sub">{entry.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemEditor() {
  const items = usePanel((store) => store.view?.state.items);
  const selected = usePanel((store) => store.selectedItem);
  const item = selected === undefined
    ? undefined
    : items?.[selected];

  return (
    <section className="col">
      <div className="head"><span>Item</span></div>
      <div className="body">
        {selected === undefined || item === undefined
          ? <p className="empty">Select an item.</p>
          : <ItemDraftEditor key={`${selected}:${JSON.stringify(item)}`} name={selected} item={item} />}
      </div>
    </section>
  );
}
