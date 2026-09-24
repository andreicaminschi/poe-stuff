/** Why a verb column shows nothing. */
export function VerbOff({ head, use, note }: { readonly head: string; readonly use: string; readonly note: string }) {
  return (
    <div className="off">
      <p className="offhead">{head}</p>
      <p className="use">{use}</p>
      <p className="note">{note}</p>
    </div>
  );
}
