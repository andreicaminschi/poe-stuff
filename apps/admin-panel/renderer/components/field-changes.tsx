import type { FieldChange } from "../utils/field-diff.ts";

/** Each changed field, before and after. */
export function FieldChanges({ changes }: { readonly changes: readonly FieldChange[] }) {
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
