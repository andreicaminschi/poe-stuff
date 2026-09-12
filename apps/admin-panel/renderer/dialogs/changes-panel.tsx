import { useMemo } from "react";
import type { Draft } from "../../api/taxonomy/types.ts";
import { Modal } from "../components/modal.tsx";
import { useSession } from "../session-store.ts";
import { displayName } from "../utils/display-name.ts";
import { fieldDiff, type FieldChange } from "../utils/field-diff.ts";
import { replayLedger } from "../utils/replay-ledger.ts";

function Diff({ changes }: { readonly changes: readonly FieldChange[] }) {
  if (changes.length === 0) return <p className="note">No field changed.</p>;

  return (
    <div className="diff">
      {changes.map((change) => (
        <div className="diff-row" key={change.field}>
          <span className="faint">{change.field}</span>
          <span className="mono old">{change.before}</span>
          <span className="mono new">{change.after}</span>
        </div>
      ))}
    </div>
  );
}

export function ChangesPanel() {
  const base = useSession((state) => state.base);
  const ledger = useSession((state) => state.ledger);
  const goTo = useSession((state) => state.goTo);
  const select = useSession((state) => state.select);
  const closeDialog = useSession((state) => state.closeDialog);

  const befores = useMemo(
    () => (base === undefined ? [] : ledger.map((_entry, at) => replayLedger(base, ledger.slice(0, at)))),
    [base, ledger],
  );

  const entries = ledger.map((entry, at) => ({ entry, before: befores[at] })).reverse();

  return (
    <Modal title="Changes" onClose={closeDialog} wide>
      {entries.length === 0 ? <p className="note pad">No saved changes since the last publish.</p> : null}
      {entries.map(({ entry, before }) => (
        <div className="grp" key={entry.seq}>
          <h4>
            #{entry.seq} · {entry.action} · {new Date(entry.at).toLocaleString()}
          </h4>
          {Object.entries(entry.changes.items ?? {}).map(([key, item]) => (
            <div className="change" key={key}>
              <button type="button" className="problem" onClick={() => goTo(key)}>
                <span>{displayName(item)}</span>
                <span className="mono faint">{key}</span>
              </button>
              <Diff changes={fieldDiff(before?.items[key], item)} />
            </div>
          ))}
          {Object.entries(entry.changes.categories ?? {}).map(([path, category]) => (
            <div className="change" key={path}>
              <button
                type="button"
                className="problem"
                onClick={() => {
                  select(path);
                  closeDialog();
                }}
              >
                <span className="mono">{path}</span>
                <span className="faint">{categoryLabel(before, path, category === null)}</span>
              </button>
              <Diff changes={fieldDiff(before?.categories[path], category)} />
            </div>
          ))}
        </div>
      ))}
    </Modal>
  );
}

function categoryLabel(before: Draft | undefined, path: string, deleted: boolean): string {
  if (deleted) return "deleted";

  return before?.categories[path] === undefined ? "new category" : "category";
}
