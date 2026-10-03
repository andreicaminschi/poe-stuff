import { useEffect, useMemo } from "react";
import { findUndoable } from "../apply-entry.ts";
import { CategoryList } from "./category-list.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { ItemList } from "./item-list.tsx";
import { matchItem } from "./match-item.ts";
import { NewCategoryDialog } from "./new-category-dialog.tsx";
import { NewSeederDialog } from "./new-seeder-dialog.tsx";
import { Omnibar } from "./omnibar.tsx";
import { sortCategories } from "./sort-categories.ts";
import { formatSeederKey, readSeederCategory, readSeederName } from "../seeder-key.ts";
import { SeederEditor } from "./seeder-editor.tsx";
import { SeederList } from "./seeder-list.tsx";
import { sortSeeders } from "./sort-seeders.ts";
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
  const selected = usePanel((state) => state.selected);
  const dialog = usePanel((state) => state.dialog);
  const { load, setView, save, undo, guard, selectFirst, openDialog } = usePanel.getState();
  const edits = pending.length;
  const canUndo = loaded !== undefined && findUndoable([...loaded.log, ...pending]) !== undefined;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      guard(undo);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, guard]);

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

  const selectedCategory = categoriesInScope.find((category) => category.name === readSeederCategory(selected ?? ""));
  const selectedSeeder = selectedCategory?.seeders.find((seeder) => seeder.name === readSeederName(selected ?? ""));
  const firstInScope = categoriesInScope
    .flatMap((category) => sortSeeders(category.seeders).map((seeder) => formatSeederKey(category.name, seeder.name)))
    .at(0);

  useEffect(() => {
    if (view === "seeders" && selectedSeeder === undefined) selectFirst(firstInScope);
  }, [view, selectedSeeder, firstInScope, selectFirst]);

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
          <button type="button" className="btn" disabled={!canUndo || saving} title="Ctrl+Z" onClick={() => guard(undo)}>Undo</button>
          <button type="button" className="btn" disabled={edits === 0 || saving} onClick={() => guard(() => void save())}>
            {saving
              ? "Saving…"
              : "Save"}
          </button>
        </div>
      </div>
      {error === undefined
        ? null
        : <div className="banner">{error}</div>}
      <div className={view === "items"
        ? "cols items-view"
        : "cols seeders-view"}
      >
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
            {view === "seeders"
              ? <button type="button" className="btn tiny ghost" onClick={() => openDialog("seeder")}>+ New seeder</button>
              : null}
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
              : <SeederList categories={categoriesInScope} itemCounts={loaded?.itemCounts ?? new Map()} selected={selected} />}
          </div>
        </section>
        {view === "seeders" && loaded !== undefined && selected !== undefined && selectedCategory !== undefined && selectedSeeder !== undefined
          ? (
              <SeederEditor
                key={selected}
                seederKey={selected}
                category={selectedCategory}
                original={selectedSeeder}
                categories={sortCategories(loaded.categories)}
              />
            )
          : null}
        {view === "seeders" && selectedSeeder === undefined
          ? (
              <section className="col editor">
                <div className="body editor-empty">
                  <p className="empty">No seeder to edit here. Create one to start editing.</p>
                  <button type="button" className="btn tiny ghost" onClick={() => openDialog("seeder")}>+ New seeder</button>
                </div>
              </section>
            )
          : null}
      </div>
      <ConfirmDialog />
      {dialog === "category"
        ? <NewCategoryDialog takenNames={(loaded?.categories ?? []).map((category) => category.name)} />
        : null}
      {dialog === "seeder" && loaded !== undefined
        ? <NewSeederDialog categories={sortCategories(loaded.categories)} initialCategory={pickedCategories[0] ?? sortCategories(loaded.categories)[0]?.name ?? ""} />
        : null}
    </>
  );
}
