import { useState } from "react";
import type { ValueOption } from "../types.ts";

const SHOWN = 50;

function matching(options: readonly ValueOption[], value: string): readonly ValueOption[] {
  const needle = value.trim().toLowerCase();
  if (needle === "") return options.slice(0, SHOWN);

  return options
    .filter((option) => option.value.toLowerCase().includes(needle) || option.label?.toLowerCase().includes(needle) === true)
    .slice(0, SHOWN);
}

/**
 * A text box with its own suggestion list: type to filter, arrows to move, Enter to pick,
 * Escape to close. A typed value that is not in the list is kept.
 */
export function ComboBox({
  value,
  options,
  onChange,
  onCommit,
  onBlur,
  placeholder,
  disabled,
  className,
  ariaLabel,
  id,
}: {
  readonly id?: string;
  readonly value: string;
  readonly options: readonly ValueOption[];
  readonly onChange: (value: string) => void;
  /** Enter, or a pick from the list. */
  readonly onCommit?: (value: string) => void;
  readonly onBlur?: () => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = open ? matching(options, value) : [];

  const choose = (picked: string) => {
    onChange(picked);
    onCommit?.(picked);
    setOpen(false);
  };

  return (
    <div className="combo">
      <input
        id={id}
        type="text"
        className={className}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        autoComplete="off"
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((at) => Math.min(at + 1, Math.max(matches.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((at) => Math.max(at - 1, 0));
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key !== "Enter") return;

          const picked = matches[active];
          if (picked !== undefined) {
            choose(picked.value);
            return;
          }
          onCommit?.(value);
          setOpen(false);
        }}
      />
      {matches.length === 0 || disabled === true ? null : (
        <ul className="combo-list" role="listbox">
          {matches.map((option, at) => (
            <li
              key={option.value}
              role="option"
              aria-selected={at === active}
              className={at === active ? "on" : ""}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option.value);
              }}
            >
              <span>{option.value}</span>
              {option.label === undefined ? null : <span className="faint">{option.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
