import { Fragment, useState, type ReactNode } from "react";

type ChipListProps = {
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly placeholder: string;
  readonly suggestions?: readonly string[];
  /** Shown before a chip's value, such as its operator. */
  readonly prefix?: (value: string) => string;
  /** Replaces the text input. */
  readonly adder?: ReactNode;
};

/** Editable chips: Enter adds, × removes. */
export function ChipList({ values, onChange, placeholder, suggestions, prefix, adder }: ChipListProps) {
  const [text, setText] = useState("");
  const listId = `chips-${placeholder.replace(/\W+/g, "-")}`;

  const add = (): void => {
    const typed = text.trim();
    if (typed === "" || values.includes(typed)) return;
    onChange([...values, typed]);
    setText("");
  };

  return (
    <div className="chips">
      {values.map((value) => (
        <Fragment key={value}>
          {prefix === undefined || prefix(value) === ""
            ? null
            : <span className="chip outline op">{prefix(value)}</span>}
          <span className="chip mono">
            {value}
            <button type="button" className="chip-x" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((entry) => entry !== value))}>×</button>
          </span>
        </Fragment>
      ))}
      {adder ?? (
        <input
          className="chip-input"
          value={text}
          placeholder={placeholder}
          list={suggestions === undefined
            ? undefined
            : listId}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            add();
          }}
        />
      )}
      {suggestions === undefined
        ? null
        : <datalist id={listId}>{suggestions.map((entry) => <option key={entry} value={entry} />)}</datalist>}
    </div>
  );
}
