/** One yes/no flag across every checked item: set it on all, clear it on all, and how many have it. */
export function BulkFlagGroup({
  title,
  setLabel,
  clearLabel,
  count,
  total,
  note,
  disabled,
  apply,
}: {
  readonly title: string;
  readonly setLabel: string;
  readonly clearLabel: string;
  readonly count: number;
  readonly total: number;
  readonly note: string;
  readonly disabled: boolean;
  readonly apply: (on: boolean) => void;
}) {
  return (
    <div className="grp">
      <h4>{title}</h4>
      <div className="row">
        <button type="button" className="btn" disabled={disabled || count === total} onClick={() => apply(true)}>
          {setLabel}
        </button>
        <button type="button" className="btn" disabled={disabled || count === 0} onClick={() => apply(false)}>
          {clearLabel}
        </button>
      </div>
      <p className="note">{note}</p>
    </div>
  );
}
