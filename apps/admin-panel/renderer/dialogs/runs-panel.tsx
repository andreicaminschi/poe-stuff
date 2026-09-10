import { useCallback, useEffect, useState } from "react";
import { CATALOG_SOURCES, LEAGUE, type CatalogSource, type RunSummary } from "../../api/panel-api.ts";
import { Modal } from "../components/modal.tsx";
import { useSession } from "../session-store.ts";

type Status = "idle" | "running" | "done" | "failed";

const hourLabel = (hour: number): string =>
  `${new Date(hour * 1000).toISOString().slice(0, 13).replace("T", " ")}:00 UTC`;

export function RunsPanel() {
  const onClose = useSession((state) => state.closeDialog);
  const [runs, setRuns] = useState<readonly RunSummary[] | undefined>();
  const [force, setForce] = useState<readonly CatalogSource[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [log, setLog] = useState("");
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    window.panel.getRuns().then(setRuns, (reason: unknown) => setError(String(reason)));
  }, []);

  useEffect(load, [load]);

  const build = async () => {
    if (force.length > 0 && !window.confirm(`Refetching ${force.join(", ")} overwrites what that hour's run recorded. Go on?`)) {
      return;
    }
    setStatus("running");
    setLog("");
    const result = await window.panel.buildCatalog(LEAGUE, force);
    setStatus(result.ok ? "done" : "failed");
    setLog(result.log);
    load();
  };

  const publish = async (run: RunSummary) => {
    if (!window.confirm(`Make ${run.id} the current ${run.league} catalog?`)) return;
    const result = await window.panel.publishCatalog(run.league, run.hour);
    setStatus(result.ok ? "done" : "failed");
    setLog(result.log);
  };

  const toggle = (source: CatalogSource) =>
    setForce((current) => (current.includes(source) ? current.filter((other) => other !== source) : [...current, source]));

  return (
    <Modal title={`Catalog — ${LEAGUE}`} onClose={onClose} wide>
      <div className="grp">
        <h4>Build</h4>
        <p className="note">Builds the last finished hour. Minutes of requests to GGG — one build at a time.</p>
        <div className="row gap">
          <span className="faint">Refetch:</span>
          {CATALOG_SOURCES.map((source) => (
            <label className="check" key={source}>
              <input type="checkbox" checked={force.includes(source)} onChange={() => toggle(source)} /> {source}
            </label>
          ))}
          <span className="sp" />
          <span className={`pill ${status}`}>{status}</span>
          <button type="button" className="btn primary" disabled={status === "running"} onClick={() => void build()}>
            Build catalog
          </button>
        </div>
        {log === "" ? null : (
          <details open={status === "failed"}>
            <summary className="note">Output</summary>
            <pre className="log">{log}</pre>
          </details>
        )}
      </div>

      <div className="grp">
        <h4>Runs</h4>
        {error === undefined ? null : <p className="err">{error}</p>}
        {runs === undefined ? <p className="note">Loading…</p> : null}
        {runs?.length === 0 ? <p className="note">No runs yet.</p> : null}
        {runs?.map((run) => (
          <div className="variant" key={run.id}>
            <span className="vn mono">{hourLabel(run.hour)}</span>
            <span className="vp">taxonomy {run.taxonomyVersion ?? "?"}</span>
            <span className={`pill ${run.built ? "done" : "failed"}`}>{run.built ? "built" : "incomplete"}</span>
            <button type="button" className="btn tiny" disabled={!run.built || status === "running"} onClick={() => void publish(run)}>
              Publish
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
