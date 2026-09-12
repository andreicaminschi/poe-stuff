import { useState } from "react";
import type { ValueOption } from "../types.ts";
import { ComboBox } from "./combo-box.tsx";

export function ListValue({
  value,
  onChange,
  disabled,
  options,
}: {
  readonly value: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly disabled: boolean;
  readonly options?: readonly ValueOption[];
}) {
  const [adding, setAdding] = useState("");

  const add = (entry: string) => {
    const trimmed = entry.trim();
    if (trimmed !== "" && !value.includes(trimmed)) onChange([...value, trimmed]);
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
        <ComboBox
          className="addtag"
          placeholder="+ add"
          value={adding}
          options={options ?? []}
          onChange={setAdding}
          onCommit={add}
          onBlur={() => add(adding)}
        />
      )}
    </div>
  );
}
