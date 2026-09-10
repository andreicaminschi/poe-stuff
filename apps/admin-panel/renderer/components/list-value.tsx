import { useState } from "react";

export function ListValue({
  value,
  onChange,
  disabled,
}: {
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly disabled: boolean;
}) {
  const [adding, setAdding] = useState("");

  const add = () => {
    const entry = adding.trim();
    if (entry !== "" && !value.includes(entry)) onChange([...value, entry]);
    setAdding("");
  };

  return (
    <div className="listval">
      {value.map((entry) => (
        <span className="tag" key={entry}>
          {entry}
          {disabled ? null : (
            <button type="button" className="x" onClick={() => onChange(value.filter((other) => other !== entry))}>
              ×
            </button>
          )}
        </span>
      ))}
      {disabled ? null : (
        <input
          type="text"
          className="addtag"
          placeholder="+ add"
          value={adding}
          onChange={(event) => setAdding(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") add();
          }}
          onBlur={add}
        />
      )}
    </div>
  );
}
