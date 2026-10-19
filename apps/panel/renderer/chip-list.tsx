import { useState } from "react";

type ChipListProps = {
  readonly values: readonly string[];
  readonly onChange: (values: readonly string[]) => void;
  readonly placeholder: string;
  readonly expand?: (value: string) => readonly string[];
  readonly suggestions?: readonly string[];
};

/** Editable chips: Enter adds, × removes. */
export function ChipList({ values, onChange, placeholder, expand, suggestions }: ChipListProps) {
  const [text, setText] = useState("");
  const listId = `chips-${placeholder.replace(/\W+/g, "-")}`;

  const add = (): void => {
    const typed = text.trim();
    if (typed === "") return;
    const expanded = expand === undefined
      ? [typed]
      : expand(typed);
    onChange([...values, ...expanded.filter((value) => !values.includes(value))]);
    setText("");
  };

  return (
    <div className="chips">
      {values.map((value) => (
        <span key={value} className="chip mono">
          {value}
          <button type="button" className="chip-x" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((entry) => entry !== value))}>×</button>
        </span>
      ))}
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
      {suggestions === undefined
        ? null
        : <datalist id={listId}>{suggestions.map((entry) => <option key={entry} value={entry} />)}</datalist>}
    </div>
  );
}
