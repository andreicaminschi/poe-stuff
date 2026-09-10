import type { Condition } from "../../api/taxonomy.types.ts";
import type { Level, ResolvedCondition } from "../../api/taxonomy.resolve.api.ts";
import type { Kind } from "../types.ts";
import { formatCondition } from "../utils/format-condition.ts";
import { kindOf } from "../utils/kind-of.ts";
import { ValueEditor } from "./value-editor.tsx";

const OPERATORS = ["==", "=", "!=", "!", "<", "<=", ">", ">="];

const KINDS: readonly (readonly [Kind, string])[] = [
  ["text", "text"],
  ["number", "number"],
  ["flag", "yes/no"],
  ["list", "list"],
  ["from-name", "row's name"],
  ["from-baseTypes", "row's base types"],
  ["remove", "remove"],
];

const LEVEL_LABEL: Readonly<Record<Level, string>> = {
  category: "From the category",
  subcategory: "From the subcategory",
  item: "From the item",
  variant: "From the variant",
};

const EMPTY: Readonly<Record<Kind, Pick<Condition, "value" | "from">>> = {
  text: { value: "" },
  number: { value: 0 },
  flag: { value: true },
  list: { value: [] },
  "from-name": { from: "name" },
  "from-baseTypes": { from: "baseTypes" },
  remove: { value: null },
};

const withKind = (condition: Condition, kind: Kind): Condition => ({
  condition: condition.condition,
  ...(condition.operator === undefined ? {} : { operator: condition.operator }),
  ...EMPTY[kind],
});

export type ResolvedView = {
  readonly label: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly problems: readonly string[];
};

export function ConditionsEditor({
  own,
  onChange,
  inherited,
  resolved,
  note,
  names,
}: {
  readonly own: readonly Condition[];
  readonly onChange?: (conditions: readonly Condition[]) => void;
  readonly inherited?: readonly ResolvedCondition[];
  readonly resolved?: ResolvedView;
  readonly note?: string;
  readonly names: readonly string[];
}) {
  const disabled = onChange === undefined;
  const replace = (index: number, next: Condition) =>
    onChange?.(own.map((condition, at) => (at === index ? next : condition)));
  const levels = [...new Set((inherited ?? []).map((condition) => condition.level))];

  return (
    <div className="conditions">
      <datalist id="condition-names">
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {levels.map((level) => (
        <div className="clevel" key={level}>
          <div className="cap">{LEVEL_LABEL[level]}</div>
          {(inherited ?? [])
            .filter((condition) => condition.level === level)
            .map((condition) => (
              <div className="crow inherited" key={`${condition.condition} ${condition.operator ?? "=="}`}>
                <span className="frozen">{formatCondition(condition)}</span>
                {disabled ? null : (
                  <button
                    type="button"
                    className="btn icon"
                    title="Remove here"
                    onClick={() =>
                      onChange([
                        ...own,
                        {
                          condition: condition.condition,
                          ...(condition.operator === undefined ? {} : { operator: condition.operator }),
                          value: null,
                        },
                      ])
                    }
                  >
                    ⊘
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}

      <div className="clevel">
        <div className="cap">
          <span>Added here</span>
          <span className="sp" />
          {disabled ? null : (
            <button
              type="button"
              className="btn tiny ghost"
              onClick={() => onChange([...own, { condition: "", operator: "==", value: "" }])}
            >
              + Condition
            </button>
          )}
        </div>
        {own.length === 0 ? <p className="note">None.</p> : null}
        {own.map((condition, index) => (
          <div className={`crow own${kindOf(condition) === "remove" ? " removed" : ""}`} key={index}>
            <input
              type="text"
              list="condition-names"
              placeholder="Condition"
              value={condition.condition}
              disabled={disabled}
              onChange={(event) => replace(index, { ...condition, condition: event.target.value })}
            />
            <select
              className="mono"
              value={condition.operator ?? "=="}
              disabled={disabled}
              onChange={(event) => replace(index, { ...condition, operator: event.target.value })}
            >
              {OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
            <select
              value={kindOf(condition)}
              disabled={disabled}
              onChange={(event) => replace(index, withKind(condition, event.target.value as Kind))}
            >
              {KINDS.map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
            <ValueEditor condition={condition} disabled={disabled} onChange={(next) => replace(index, next)} />
            {disabled ? (
              <span />
            ) : (
              <button
                type="button"
                className="btn icon"
                title="Delete"
                onClick={() => onChange(own.filter((_, at) => at !== index))}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {resolved === undefined ? null : (
        <>
          <div className="cap">{resolved.label}</div>
          <div className="resolved">
            {resolved.conditions.length === 0 ? (
              <span className="faint">Nothing. It matches everything.</span>
            ) : (
              resolved.conditions.map((condition) => (
                <div key={`${condition.condition} ${condition.operator ?? "=="}`}>{formatCondition(condition)}</div>
              ))
            )}
          </div>
          {resolved.problems.map((problem) => (
            <p className="err" key={problem}>
              {problem}
            </p>
          ))}
        </>
      )}
      {note === undefined ? null : <p className="note">{note}</p>}
    </div>
  );
}
