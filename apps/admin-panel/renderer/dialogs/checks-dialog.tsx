import { Modal } from "../components/modal.tsx";
import { useCurrentVersion } from "../hooks/use-current-version.ts";
import { useSession } from "../session-store.ts";

export function ChecksDialog() {
  const closeDialog = useSession((state) => state.closeDialog);
  const validate = useSession((state) => state.validate);
  const validateFilter = useSession((state) => state.validateFilter);
  const compileFilter = useSession((state) => state.compileFilter);
  const current = useCurrentVersion();

  const start = (action: () => Promise<void>) => {
    closeDialog();
    void action();
  };

  return (
    <Modal title="Validate" onClose={closeDialog}>
      <div className="grp">
        <button type="button" className="btn" onClick={() => start(validate)}>
          Taxonomy
        </button>
        <p className="note">Broken rows, category resolution and unauthored paths.</p>
      </div>
      <div className="grp">
        <button type="button" className="btn" onClick={() => start(validateFilter)}>
          Filter
        </button>
        <p className="note">Sample items no block takes, or the wrong block takes.</p>
      </div>
      <div className="grp">
        <button type="button" className="btn" disabled={current === undefined} onClick={() => start(compileFilter)}>
          Compile filter
        </button>
        <p className="note">Writes the unstyled .filter to the game folder, to load in the client.</p>
      </div>
    </Modal>
  );
}
