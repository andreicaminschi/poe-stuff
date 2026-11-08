import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { CategoryList } from "./category-list.tsx";
import { ColumnHandle } from "./column-handle.tsx";
import { DialogHost } from "./dialog-host.tsx";
import { FilterChips } from "./filter-chips.tsx";
import { ItemEditor } from "./item-editor.tsx";
import { ItemList } from "./item-list.tsx";
import { Omnibar } from "./omnibar.tsx";
import { PlanDialog } from "./plan-dialog.tsx";
import { readSavedWidth } from "./read-saved-width.ts";
import type { ColumnSize } from "./read-saved-width.ts";
import { SeederEditor } from "./seeder-editor.tsx";
import { SeederList } from "./seeder-list.tsx";
import { usePanel } from "./store.ts";

const SIDEBAR_SIZE: ColumnSize = { key: "panel.sidebarWidth", fallback: 240, min: 160, max: 480 };
const EDITOR_SIZE: ColumnSize = { key: "panel.editorWidth", fallback: 420, min: 320, max: 800 };

/** Ctrl+Z undoes, outside text fields. */
function useUndoKey(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      void usePanel.getState().undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function TopBar() {
  const view = usePanel((state) => state.view);
  const busy = usePanel((state) => state.busy);
  const { undo, save } = usePanel.getState();

  return (
    <header className="bar">
      <h1>Panel</h1>
      <Omnibar />
      <div className="bar-end">
        {view === undefined
          ? null
          : (
              <span className="pill">
                {`${view.version} · ${view.published
                  ? "published"
                  : "draft"}`}
              </span>
            )}
        {view === undefined || view.pending === 0
          ? null
          : <span className="pill warn">{`${String(view.pending)} unsaved`}</span>}
        <button
          type="button"
          className="btn"
          disabled={busy || view?.undoable === undefined}
          title={view?.undoable === undefined
            ? "Nothing to undo"
            : `Undo ${view.undoable} (Ctrl+Z)`}
          onClick={() => void undo()}
        >
          Undo
        </button>
        <button type="button" className="btn primary" disabled={busy || view === undefined || view.pending === 0} onClick={() => void save()}>Save</button>
      </div>
    </header>
  );
}

function ErrorBanner() {
  const error = usePanel((state) => state.error);
  const clearError = usePanel((state) => state.clearError);
  if (error === undefined) return null;
  return (
    <div className="banner" role="alert">
      <span>{error}</span>
      <button type="button" className="btn tiny ghost" onClick={clearError}>Dismiss</button>
    </div>
  );
}

export function App() {
  const view = usePanel((state) => state.view);
  const mode = usePanel((state) => state.mode);
  const plan = usePanel((state) => state.plan);
  const setMode = usePanel((state) => state.setMode);
  const [sidebarWidth, setSidebarWidth] = useState(() => readSavedWidth(SIDEBAR_SIZE));
  const [editorWidth, setEditorWidth] = useState(() => readSavedWidth(EDITOR_SIZE));
  const columnWidths = {
    "--sidebar-width": `${String(sidebarWidth)}px`,
    "--editor-width": `${String(editorWidth)}px`,
  } as CSSProperties;

  useEffect(() => {
    void usePanel.getState().load();
    void usePanel.getState().loadModels();
  }, []);
  useUndoKey();

  return (
    <>
      <TopBar />
      <FilterChips />
      <ErrorBanner />
      <nav className="tabs">
        <button
          type="button"
          className={mode === "seeders"
            ? "tab on"
            : "tab"}
          onClick={() => setMode("seeders")}
        >
          Seeders
        </button>
        <button
          type="button"
          className={mode === "items"
            ? "tab on"
            : "tab"}
          onClick={() => setMode("items")}
        >
          Items
        </button>
      </nav>
      {view === undefined
        ? <p className="empty">Loading…</p>
        : (
            <main className="cols" style={columnWidths}>
              <CategoryList />
              <ColumnHandle side="left" size={SIDEBAR_SIZE} width={sidebarWidth} onResize={setSidebarWidth} />
              {mode === "seeders"
                ? <SeederList />
                : <ItemList />}
              <ColumnHandle side="right" size={EDITOR_SIZE} width={editorWidth} onResize={setEditorWidth} />
              {mode === "seeders"
                ? <SeederEditor />
                : <ItemEditor />}
            </main>
          )}
      <DialogHost />
      {plan === undefined
        ? null
        : <PlanDialog key={plan.id} />}
    </>
  );
}
