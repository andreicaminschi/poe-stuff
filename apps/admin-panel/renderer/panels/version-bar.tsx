import { useCurrentVersion } from "../hooks/use-current-version.ts";
import { useDirty } from "../hooks/use-dirty.ts";
import { useSession } from "../session-store.ts";

export function VersionBar() {
  const versions = useSession((state) => state.versions);
  const busy = useSession((state) => state.busy);
  const status = useSession((state) => state.status);
  const switchVersion = useSession((state) => state.switchVersion);
  const newDraft = useSession((state) => state.newDraft);
  const validate = useSession((state) => state.validate);
  const publish = useSession((state) => state.publish);
  const compileFilter = useSession((state) => state.compileFilter);
  const openDialog = useSession((state) => state.openDialog);
  const ledgerSize = useSession((state) => state.ledger.length);
  const current = useCurrentVersion();
  const dirty = useDirty();

  if (versions === undefined) return null;

  const published = versions.versions.filter((version) => version.state === "published");

  return (
    <div className="bar">
      <span className="ver mono">{current?.id ?? "—"}</span>
      {current === undefined ? null : <span className={`pill ${current.state}`}>{current.state}</span>}
      {current !== undefined && current.id === versions.current ? <span className="pill live">current</span> : null}
      {current?.parent === undefined ? null : <span className="from">from {current.parent}</span>}
      <div className="sep" />
      <select
        className="tiny"
        aria-label="Switch version"
        value={current?.id ?? ""}
        onChange={(event) => switchVersion(event.target.value)}
      >
        {versions.versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.id} · {version.state}
          </option>
        ))}
      </select>
      <select
        className="tiny"
        aria-label="New draft from"
        value=""
        disabled={busy || published.length === 0}
        onChange={(event) => {
          if (event.target.value !== "") void newDraft(event.target.value);
        }}
      >
        <option value="">New draft from…</option>
        {published.map((version) => (
          <option key={version.id} value={version.id}>
            {version.id}
          </option>
        ))}
      </select>
      <span className="sp" />
      {status === undefined ? null : <span className="from">{status}</span>}
      {dirty === 0 ? null : (
        <span className="from">
          {dirty} unsaved edit{dirty === 1 ? "" : "s"}
        </span>
      )}
      <button type="button" className="btn" disabled={ledgerSize === 0} onClick={() => openDialog({ kind: "changes" })}>
        View changes{ledgerSize === 0 ? "" : ` ${ledgerSize}`}
      </button>
      <button type="button" className="btn" disabled={busy || current === undefined} onClick={() => void validate()}>
        Validate
      </button>
      <button
        type="button"
        className="btn"
        disabled={busy || current?.editable !== true}
        onClick={() => void compileFilter()}
      >
        Compile filter
      </button>
      <button
        type="button"
        className="btn primary"
        disabled={busy || current?.editable !== true}
        onClick={() => void publish()}
      >
        Publish{current?.editable === true ? ` ${current.id}` : ""}
      </button>
      <div className="sep" />
      <button type="button" className="btn" onClick={() => openDialog({ kind: "runs" })}>
        Catalog runs
      </button>
    </div>
  );
}
