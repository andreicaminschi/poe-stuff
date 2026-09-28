import { groupUnfiltered } from "@poe/filter-validate/group-unfiltered";
import { useMemo } from "react";
import { Modal } from "../components/modal.tsx";
import { FlaggedGroupRow } from "../components/flagged-group-row.tsx";
import { PairSection } from "../components/pair-section.tsx";
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

  const groups = useMemo(() => (report === undefined
    ? []
    : groupUnfiltered(report.rows)), [report]);

  if (report === undefined) return null;
  const fall = report.fallThrough;
  const open = (key: string) => void goTo(key);

  return (
    <Modal
      title="Filter check"
      onClose={closeDialog}
      wide
      footer={(
        <>
          <button type="button" className="btn" disabled={busy} onClick={() => void saveReport()}>
            Save CSV
          </button>
          <button type="button" className="btn" onClick={closeDialog}>
            Close
          </button>
        </>
      )}
    >
      <div className="grp">
        <p className="note">
          {report.sampled}
          {" "}
          samples built,
          {report.unfiltered}
          {" "}
          not taken by any block of the compiled filter.
        </p>
        {report.unsampled.length === 0
          ? null
          : (
              <p className="note">
                No sample sets for:
                {report.unsampled.join(", ")}
              </p>
            )}
        {status === undefined
          ? null
          : <p className="note">{status}</p>}
      </div>
      {groups.map((group) => (
        <div className="grp" key={group.path}>
          <h4>
            {group.path}
            {" "}
            ·
            {group.count}
          </h4>
          {group.rows.map((row) => (
            <UnfilteredRow key={row.key} row={row} onOpen={open} />
          ))}
        </div>
      ))}
      <div className="grp">
        <p className="note">
          Own-miss
          {" "}
          {fall.ownMiss.length}
          {" "}
          · fall-through
          {" "}
          {fall.fallThrough.length}
          {" "}
          · overlap
          {" "}
          {fall.overlap.length}
          {" "}
          ·
          blind
          {" "}
          {fall.blind.length}
          {" "}
          · rejected
          {" "}
          {fall.rejected.length}
        </p>
      </div>
      <PairSection title="Own-miss: no block of its own path matched" pairs={fall.ownMiss} onOpen={open} />
      <PairSection title="Fall-through: another path won" pairs={fall.fallThrough} onOpen={open} />
      <PairSection title="Overlap: another path also matched" pairs={fall.overlap} onOpen={open} />
      {fall.blind.length === 0
        ? null
        : (
            <div className="grp">
              <h4>Blind: the winning block ignores a varied property</h4>
              {fall.blind.map((group) => (
                <FlaggedGroupRow
                  key={`${group.path}\n${group.property}`}
                  label={group.property}
                  group={group}
                  onOpen={open}
                />
              ))}
            </div>
          )}
      {fall.rejected.length === 0
        ? null
        : (
            <div className="grp">
              <h4>Rejected: its own path took a reject sample</h4>
              {fall.rejected.map((group) => (
                <FlaggedGroupRow key={`${group.path}\n${group.reject}`} label={group.reject} group={group} onOpen={open} />
              ))}
            </div>
          )}
    </Modal>
  );
}
