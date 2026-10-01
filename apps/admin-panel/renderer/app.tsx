import { useEffect, useMemo } from "react";
import { findUndoable } from "./apply-entry.ts";
import { CategoryList } from "./category-list.tsx";
import { ItemList } from "./item-list.tsx";
import { matchItem } from "./match-item.ts";
import { Omnibar } from "./omnibar.tsx";
import { SeederList } from "./seeder-list.tsx";
import { SeederModal } from "./seeder-modal.tsx";
import { usePanel } from "./store.ts";
import "./app.css";

export function App() {
  const loaded = usePanel((state) => state.loaded);
  const error = usePanel((state) => state.error);
  const pickedCategories = usePanel((state) => state.pickedCategories);
  const pickedSeeders = usePanel((state) => state.pickedSeeders);
  const query = usePanel((state) => state.query);
  const view = usePanel((state) => state.view);
  const pending = usePanel((state) => state.pending);
  const saving = usePanel((state) => state.saving);
  const editing = usePanel((state) => state.editing);
  const { load, setView, save, undo } = usePanel.getState();
  const edits = pending.length;
  const canUndo = loaded !== undefined && findUndoable([...loaded.log, ...pending]) !== undefined;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (usePanel.getState().editing !== undefined) return;
      event.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const items = useMemo(
    () => (loaded?.items ?? []).filter((item) => matchItem(item, { categories: pickedCategories, seeders: pickedSeeders, query })),
    [loaded, pickedCategories, pickedSeeders, query],
  );
  const categoriesInScope = (loaded?.categories ?? []).filter(
    (category) => pickedCategories.length === 0 || pickedCategories.includes(category.name),
  );
  const scopeName = pickedCategories.length === 0
    ? "all categories"
    : pickedCategories.join(", ");
  const seederCount = categoriesInScope.reduce((sum, category) => sum + category.seeders.length, 0);

  return (
    <>
      <div className="bar">
        <h1>Admin panel</h1>
        <Omnibar />
        <div className="bar-end">
          {loaded === undefined
            ? null
            : <span className="pill">{`${loaded.version} · ${loaded.state}`}</span>}
          {edits === 0
            ? null
            : (
                <span className="pill">
                  {`${edits} unsaved ${edits === 1
                    ? "edit"
                    : "edits"}`}
                </span>
              )}
          <button type="button" className="btn" disabled={!canUndo || saving} title="Ctrl+Z" onClick={undo}>Undo</button>
          <button type="button" className="btn" disabled={edits === 0 || saving} onClick={() => void save()}>
            {saving
              ? "Saving…"
              : "Save"}
          </button>
        </div>
      </div>
      {error === undefined
        ? null
        : <div className="banner">{error}</div>}
      <div className="cols">
        <CategoryList />
        <section className="col items">
          <div className="head">
            <span className="label">
              {`${view === "items"
                ? "Items"
                : "Seeders"} in ${scopeName} · `}
              <span className="mono">
                {view === "items"
                  ? items.length
                  : seederCount}
              </span>
            </span>
            <span className="sp" />
            <button
              type="button"
              className="btn tiny"
              onClick={() => setView(view === "items"
                ? "seeders"
                : "items")}
            >
              {view === "items"
                ? "View seeders"
                : "View items"}
            </button>
          </div>
          <div className="body">
            {view === "items"
              ? <ItemList items={items} />
              : <SeederList categories={categoriesInScope} itemCounts={loaded?.itemCounts ?? new Map()} />}
          </div>
        </section>
      </div>
      <SeederModal key={editing} />
    </>
  );
}
