import type { ConditionOperator } from "@poe/panel-state/types";
import { useState } from "react";
import { listOperators, nameOperator } from "./operator-names.ts";

type ValueAdderProps = { readonly condition: string; readonly onAdd: (value: string, operator: ConditionOperator) => void };

/** `+` opens an operator typeahead with friendly names; then a value, and Enter adds it. */
export function ValueAdder({ condition, onAdd }: ValueAdderProps) {
  const [open, setOpen] = useState(false);
  const [operatorText, setOperatorText] = useState("");
  const [value, setValue] = useState("");
  const listId = `operators-${condition}`;
  const operators = listOperators(condition);
  const operator = operators.find((entry) => nameOperator(entry, condition) === operatorText.trim().toLowerCase());

  const close = (): void => {
    setOpen(false);
    setOperatorText("");
    setValue("");
  };
  const add = (): void => {
    const typed = value.trim();
    if (operator === undefined || typed === "") return;
    onAdd(typed, operator);
    setValue("");
  };

  if (!open) return <button type="button" className="btn tiny" aria-label={`Add ${condition} value`} onClick={() => setOpen(true)}>+</button>;
  return (
    <span className="value-adder">
      <input
        className="field"
        autoFocus
        placeholder="operator"
        list={listId}
        value={operatorText}
        onChange={(event) => setOperatorText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      />
      <datalist id={listId}>{operators.map((entry) => <option key={entry} value={nameOperator(entry, condition)} />)}</datalist>
      <input
        className="field"
        disabled={operator === undefined}
        placeholder={operator === "range"
          ? "from-to"
          : "value"}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
          if (event.key !== "Enter") return;
          event.preventDefault();
          add();
        }}
      />
      <button type="button" className="btn tiny ghost" onClick={close}>×</button>
    </span>
  );
}
