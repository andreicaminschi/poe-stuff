import { useSession } from "../session-store.ts";
import type { BootState } from "../types.ts";

const MARK: Readonly<Record<BootState, string>> = {
  waiting: "·",
  running: "…",
  done: "✓",
  failed: "✕",
};

export function BootScreen() {
  const steps = useSession((state) => state.bootSteps);
  const booting = useSession((state) => state.booting);
  const error = useSession((state) => state.error);

  const finished = steps.filter((step) => step.state === "done" || step.state === "failed").length;
  const share = steps.length === 0 ? 0 : finished / steps.length;
  const stuck = booting && steps.some((step) => step.state === "failed") && !steps.some((step) => step.state === "running");

  return (
    <div className="boot">
      <div className="bootbox">
        <p className="label">Taxonomy admin</p>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(share * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="fill" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
        <ul className="steps">
          {steps.map((step) => (
            <li key={step.id} className={step.state}>
              <span className="mark">{MARK[step.state]}</span>
              <span>{step.label}</span>
              <span className="detail">{step.detail ?? ""}</span>
            </li>
          ))}
        </ul>
        {stuck ? <p className="err">The panel cannot open without this step. Fix it and restart.</p> : null}
        {!booting && steps.length > 0 ? <p className="note">No taxonomy version to open.</p> : null}
        {error === undefined ? null : <pre className="err">{error}</pre>}
      </div>
    </div>
  );
}
