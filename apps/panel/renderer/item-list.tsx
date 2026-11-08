import { useMemo } from "react";
import { filterItemRows } from "./filter-item-rows.ts";
import { listItemRows } from "./list-item-rows.ts";
import { usePanel } from "./store.ts";

export function ItemList() {
  const state = usePanel((store) => store.view?.state);
  const categories = usePanel((store) => store.pickedCategories);
  const seeders = usePanel((store) => store.pickedSeeders);
  const tags = usePanel((store) => store.pickedTags);
  const search = usePanel((store) => store.searchQuery);
  const openDialog = usePanel((store) => store.openDialog);
  const rows = useMemo(() => (state === undefined
    ? []
    : listItemRows(state)), [state]);
  const shown = filterItemRows(rows, { categories, seeders, tags, search });

  return (
    <section className="col">
      <div className="head">
        <span>Items</span>
        <span className="sp" />
        <span className="count">{`${String(shown.length)} of ${String(rows.length)}`}</span>
      </div>
      <div className="body">
        {shown.length === 0
          ? <p className="empty">No items.</p>
          : null}
        {shown.map((row) => (
          <div key={row.key} className="row item" onClick={() => openDialog({ kind: "item", key: row.key })}>
            <span className="name mono">
              <b>{row.head}</b>
              {" "}
              <span className="sub">{row.rest}</span>
            </span>
            <span className="item-tags">
              {row.seederTags.map((tag) => <span key={`s:${tag}`} className="chip outline">{tag}</span>)}
              {row.itemTags.map((tag) => <span key={`i:${tag}`} className="chip">{tag}</span>)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
