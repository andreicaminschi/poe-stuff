import { Modal } from "../components/modal.tsx";
import { useSession } from "../session-store.ts";

export function CompiledPanel() {
  const compiled = useSession((state) => state.compiled);
  const goTo = useSession((state) => state.goTo);
  const closeDialog = useSession((state) => state.closeDialog);

  if (compiled === undefined) return null;

  return (
    <Modal title="Compiled filter" onClose={closeDialog} wide>
      <div className="grp">
        <p className="note">
          {compiled.blocks} blocks written to <span className="mono">{compiled.path}</span>.
        </p>
      </div>
      <div className="grp">
        <h4>Skipped</h4>
        {compiled.skipped.length === 0 ? <p className="note">Nothing. Every drawable row compiled.</p> : null}
        {compiled.skipped.map((skip) => (
          <button
            type="button"
            className="problem"
            key={`${skip.key} ${skip.variant ?? ""}`}
            onClick={() => goTo(skip.key)}
          >
            <span className="mono">
              {skip.key}
              {skip.variant === undefined ? "" : ` · ${skip.variant}`}
            </span>
            <span className="danger">{skip.problem}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
