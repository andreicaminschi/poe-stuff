import { useEffect, type ReactNode } from "react";
import { usePanel } from "./store.ts";

type DialogFrameProps = {
  readonly title: string;
  readonly confirm: string;
  readonly disabled: boolean;
  readonly onConfirm: () => Promise<boolean>;
  readonly children?: ReactNode;
};

/** Modal shell: Escape or Cancel closes, confirm closes on success. */
export function DialogFrame({ title, confirm, disabled, onConfirm, children }: DialogFrameProps) {
  const busy = usePanel((state) => state.busy);
  const closeDialog = usePanel((state) => state.closeDialog);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDialog]);

  const submit = async (): Promise<void> => {
    if (await onConfirm()) closeDialog();
  };

  return (
    <div className="backdrop" onClick={closeDialog}>
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled && !busy) void submit();
        }}
      >
        <h2>{title}</h2>
        {children}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={closeDialog}>Cancel</button>
          <button type="submit" className="btn primary" disabled={disabled || busy}>{confirm}</button>
        </div>
      </form>
    </div>
  );
}
