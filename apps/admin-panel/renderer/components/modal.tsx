import { useEffect, useRef, type ReactNode } from "react";

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
  const scrim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Only the topmost modal closes.
      if ([...document.querySelectorAll(".scrim")].at(-1) !== scrim.current) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="scrim" ref={scrim} onClick={onClose}>
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
