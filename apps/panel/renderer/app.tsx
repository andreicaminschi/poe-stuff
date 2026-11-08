import { useEffect } from "react";
import { CategoriesTab } from "./categories-tab.tsx";
import { DialogHost } from "./dialog-host.tsx";
import { ItemsTab } from "./items-tab.tsx";
import { PlanDialog } from "./plan-dialog.tsx";
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
  const search = usePanel((state) => state.searchQuery);
  const { undo, save, setSearchQuery } = usePanel.getState();

  return (
    <header className="bar">
      <h1>Panel</h1>
      <input className="search" placeholder="Search items and seeders" value={search} onChange={(event) => setSearchQuery(event.target.value)} />
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
      <ErrorBanner />
      <nav className="tabs">
        <button
          type="button"
          className={mode === "items"
            ? "tab on"
            : "tab"}
          onClick={() => setMode("items")}
        >
          Items
        </button>
        <button
          type="button"
          className={mode === "categories"
            ? "tab on"
            : "tab"}
          onClick={() => setMode("categories")}
        >
          Categories
        </button>
      </nav>
      {view === undefined
        ? <p className="empty">Loading…</p>
        : (mode === "items"
            ? <ItemsTab />
            : <CategoriesTab />)}
      <DialogHost />
      {plan === undefined
        ? null
        : <PlanDialog key={plan.id} />}
    </>
  );
}
