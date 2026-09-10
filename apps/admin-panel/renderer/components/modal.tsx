import { useEffect, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={onClose}>
      <div
        className={`modal${wide ? " wide" : ""}`}
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h3>{title}</h3>
          <span className="sp" />
          <button type="button" className="btn icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="mbody">{children}</div>
        {footer === undefined ? null : <footer>{footer}</footer>}
      </div>
    </div>
  );
}
