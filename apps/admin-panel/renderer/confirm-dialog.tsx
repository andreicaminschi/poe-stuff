import { useEffect } from "react";
import { usePanel } from "./store.ts";

/** Asks before unapplied seeder changes are thrown away. */
export function ConfirmDialog() {
  const leaveAction = usePanel((state) => state.leaveAction);
  const { confirmLeave, cancelLeave } = usePanel.getState();

  useEffect(() => {
    if (leaveAction === undefined) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancelLeave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leaveAction, cancelLeave]);

  if (leaveAction === undefined) return null;

  return (
    <div className="scrim" onMouseDown={(event) => event.target === event.currentTarget && cancelLeave()}>
      <div className="modal small" role="alertdialog" aria-modal="true">
        <div className="modal-head"><h3>Unapplied changes</h3></div>
        <div className="modal-body">This seeder has changes you have not applied. They will be lost.</div>
        <div className="modal-foot">
          <span className="sp" />
          <button type="button" className="btn" autoFocus onClick={cancelLeave}>Keep editing</button>
          <button type="button" className="btn danger" onClick={confirmLeave}>Discard changes</button>
        </div>
      </div>
    </div>
  );
}
