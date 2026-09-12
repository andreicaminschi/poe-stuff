import { useEffect } from "react";
import { AuthorModal } from "./dialogs/author-modal.tsx";
import { CategoryModal } from "./dialogs/category-modal.tsx";
import { ChangesPanel } from "./dialogs/changes-panel.tsx";
import { CompiledPanel } from "./dialogs/compiled-panel.tsx";
import { ConfirmDialog } from "./dialogs/confirm-dialog.tsx";
import { DiscoverVariants } from "./dialogs/discover-variants.tsx";
import { RunsPanel } from "./dialogs/runs-panel.tsx";
import { ValidationPanel } from "./dialogs/validation-panel.tsx";
import { useCurrentVersion } from "./hooks/use-current-version.ts";
import { useDraft } from "./hooks/use-draft.ts";
import { useEditable } from "./hooks/use-editable.ts";
import { BootScreen } from "./panels/boot-screen.tsx";
import { Categories } from "./panels/categories.tsx";
import { ItemEditor } from "./panels/item-editor.tsx";
import { Items } from "./panels/items.tsx";
import { VersionBar } from "./panels/version-bar.tsx";
import { useSession } from "./session-store.ts";
import "./app.css";

export function App() {
  const boot = useSession((state) => state.boot);
  const error = useSession((state) => state.error);
  const dismissError = useSession((state) => state.dismissError);
  const dialog = useSession((state) => state.dialog);
  const booting = useSession((state) => state.booting);
  const draft = useDraft();
  const version = useCurrentVersion();
  const editable = useEditable();

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      void useSession.getState().undo();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (booting || draft === undefined) return <BootScreen />;

  return (
    <div className="app">
      <VersionBar />
      {error === undefined ? null : (
        <div className="banner">
          <pre>{error}</pre>
          <button type="button" className="btn icon" onClick={dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {!editable && version !== undefined ? (
        <div className="banner quiet">
          {version.id} is {version.state}. Read only — only the newest draft can be edited.
        </div>
      ) : null}

      <div className="cols">
        <Categories />
        <Items />
        <ItemEditor />
      </div>

      {dialog?.kind === "validation" ? <ValidationPanel /> : null}
      {dialog?.kind === "runs" ? <RunsPanel /> : null}
      {dialog?.kind === "changes" ? <ChangesPanel /> : null}
      {dialog?.kind === "compiled" ? <CompiledPanel /> : null}
      {dialog?.kind === "category" ? <CategoryModal target={dialog.target} /> : null}
      {dialog?.kind === "author" ? <AuthorModal replaces={dialog.replaces} /> : null}
      {dialog?.kind === "discover" ? <DiscoverVariants /> : null}
      <ConfirmDialog />
    </div>
  );
}
