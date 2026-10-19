import { useEffect } from "react";
import { CategoryList } from "./category-list.tsx";
import { DialogHost } from "./dialog-host.tsx";
import { FilterChips } from "./filter-chips.tsx";
import { ItemEditor } from "./item-editor.tsx";
import { ItemList } from "./item-list.tsx";
import { Omnibar } from "./omnibar.tsx";
import { PlanDialog } from "./plan-dialog.tsx";
import { SeederEditor } from "./seeder-editor.tsx";
import { SeederList } from "./seeder-list.tsx";
import { usePanel } from "./store.ts";

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
            <main className="cols">
              <CategoryList />
              {mode === "seeders"
                ? <SeederList />
                : <ItemList />}
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
