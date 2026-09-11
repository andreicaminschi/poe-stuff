export function EditorFoot({
  dirty,
  busy,
  editable,
  canUndo,
  undo,
  revert,
  save,
}: {
  readonly dirty: number;
  readonly busy: boolean;
  readonly editable: boolean;
  readonly canUndo: boolean;
  readonly undo: () => Promise<void>;
  readonly revert: () => void;
  readonly save: () => Promise<void>;
}) {
  return (
    <div className="foot end">
      <button type="button" className="btn" disabled={!canUndo || busy} onClick={() => void undo()}>
        Undo
      </button>
      <button type="button" className="btn" disabled={dirty === 0 || busy} onClick={revert}>
        Revert
      </button>
      <button
        type="button"
        className="btn primary"
        disabled={dirty === 0 || busy || !editable}
        onClick={() => void save()}
      >
        Save{dirty === 0 ? "" : ` ${dirty}`}
      </button>
    </div>
  );
}
