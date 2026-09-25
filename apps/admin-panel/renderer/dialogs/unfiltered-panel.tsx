import { groupUnfiltered } from "@poe/filter-validate/group-unfiltered";
import { useMemo } from "react";
import { Modal } from "../components/modal.tsx";
import { UnfilteredRow } from "../components/unfiltered-row.tsx";
import { useSession } from "../session-store.ts";

/** The working version's sample items that no block of its compiled filter takes. */
export function UnfilteredPanel() {
  const report = useSession((state) => state.report);
  const busy = useSession((state) => state.busy);
  const status = useSession((state) => state.status);
  const goTo = useSession((state) => state.goTo);
  const saveReport = useSession((state) => state.saveReport);
  const closeDialog = useSession((state) => state.closeDialog);

  const groups = useMemo(() => (report === undefined ? [] : groupUnfiltered(report.rows)), [report]);

  if (report === undefined) return null;

  return (
    <Modal
      title="Unfiltered items"
      onClose={closeDialog}
      wide
      footer={
        <>
          <button type="button" className="btn" disabled={busy} onClick={() => void saveReport()}>
            Save CSV
          </button>
          <button type="button" className="btn" onClick={closeDialog}>
            Close
          </button>
        </>
      }
    >
      <div className="grp">
        <p className="note">
          {report.sampled} samples built, {report.unfiltered} not taken by any block of the compiled filter.
        </p>
        {report.unsampled.length === 0 ? null : (
          <p className="note">No sample sets for: {report.unsampled.join(", ")}</p>
        )}
        {status === undefined ? null : <p className="note">{status}</p>}
      </div>
      {groups.map((group) => (
        <div className="grp" key={group.path}>
          <h4>
            {group.path} · {group.count}
          </h4>
          {group.rows.map((row) => (
            <UnfilteredRow key={row.key} row={row} onOpen={(key) => void goTo(key)} />
          ))}
        </div>
      ))}
    </Modal>
  );
}
