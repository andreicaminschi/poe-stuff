import { Modal } from "../components/modal.tsx";
import { useSession } from "../session-store.ts";

export function ValidationPanel() {
  const validation = useSession((state) => state.validation);
  const goTo = useSession((state) => state.goTo);
  const select = useSession((state) => state.select);
  const closeDialog = useSession((state) => state.closeDialog);

  if (validation === undefined) return null;

  const clean = validation.rows.length === 0 && validation.resolution.length === 0;

  return (
    <Modal title="Validation" onClose={closeDialog} wide>
      <div className="grp">
        <h4>Rule problems</h4>
        {validation.rows.length === 0 ? <p className="note">None. Nothing blocks a publish.</p> : null}
        {validation.rows.map((problem) => (
          <button
            type="button"
            className="problem"
            key={`${problem.area} ${problem.seeded} ${problem.key}`}
            onClick={() => goTo(problem.key)}
          >
            <span className="mono faint">
              {problem.area}
              {problem.seeded ? " (seeded)" : ""}
            </span>
            <span className="mono">{problem.key}</span>
            <span className="danger">{problem.problem}</span>
          </button>
        ))}
      </div>

      <div className="grp">
        <h4>Resolution</h4>
        {validation.resolution.length === 0 ? <p className="note">Every drawable row resolves.</p> : null}
        {validation.resolution.map((resolution) => (
          <button
            type="button"
            className="problem"
            key={`${resolution.key} ${resolution.variant ?? ""}`}
            onClick={() => goTo(resolution.key)}
          >
            <span className="mono">
              {resolution.key}
              {resolution.variant === undefined ? "" : ` · ${resolution.variant}`}
            </span>
            <span className="danger">{resolution.problems.join("; ")}</span>
          </button>
        ))}
      </div>

      <div className="grp">
        <h4>Categories with no conditions</h4>
        <p className="note">
          Drawable rows are filed here and nothing says how a filter names them. Most never reach a filter — the
          catalog decides that.
        </p>
        {validation.unauthored.map(({ path, rows }) => (
          <button
            type="button"
            className="problem"
            key={path}
            onClick={() => {
              select(path);
              closeDialog();
            }}
          >
            <span className="mono">{path}</span>
            <span className="mono faint">{rows} rows</span>
          </button>
        ))}
      </div>

      {clean ? <p className="note pad">Ready to publish.</p> : null}
    </Modal>
  );
}
