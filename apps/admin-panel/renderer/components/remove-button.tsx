/** A row's × button, or an empty cell where editing is off. */
export function RemoveButton({ disabled, onRemove }: { readonly disabled: boolean; readonly onRemove: () => void }) {
  if (disabled) return <span />;

  return (
    <button type="button" className="btn icon" title="Delete" onClick={onRemove}>
      ×
    </button>
  );
}
