import type { Condition, Level, RemovedCondition, ResolvedCondition } from "../../api/taxonomy/types.ts";
import type { FromValues, Kind, Origins, ValueOption, ValueOptions } from "../types.ts";
import { conditionOptions } from "../utils/condition-options.ts";
import { formatCondition } from "../utils/format-condition.ts";
import { kindOf } from "../utils/kind-of.ts";
import { originText } from "../utils/origin-text.ts";
import { ComboBox } from "./combo-box.tsx";
import { ValueEditor } from "./value-editor.tsx";

const OPERATORS = ["==", "=", "!=", "!", "<", "<=", ">", ">="];

const KINDS: readonly (readonly [Kind, string])[] = [
  ["text", "text"],
  ["number", "number"],
  ["flag", "yes/no"],
  ["list", "list"],
  ["from-name", "item's name"],
  ["from-baseTypes", "item's base type"],
  ["remove", "remove"],
];

const HINTS: Readonly<Partial<Record<Kind, string>>> = {
  remove: "Removes this condition from the levels above.",
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

const removal = (condition: Condition): Condition => ({
  condition: condition.condition,
  ...(condition.operator === undefined ? {} : { operator: condition.operator }),
  value: null,
});

const keyOf = (condition: Condition): string => `${condition.condition} ${condition.operator ?? "=="}`;

function appliedOrigin(condition: ResolvedCondition, origins: Origins): string {
  const from = `from ${originText(condition.level, origins)}`;
  if (condition.overrides === undefined) return from;

  return `${from} · overrides ${condition.overrides.map((level) => originText(level, origins)).join(", ")}`;
}

const removedOrigin = (condition: RemovedCondition, origins: Origins): string =>
  `from ${originText(condition.level, origins)}, removed by ${originText(condition.removedBy, origins)}`;

export type ResolvedView = {
  readonly label: string;
  readonly conditions: readonly ResolvedCondition[];
  readonly removed: readonly RemovedCondition[];
  readonly problems: readonly string[];
  readonly origins: Origins;
};

export function ConditionsEditor({
  own,
  onChange,
  resolved,
  note,
  names,
  row,
  valueOptions,
  level,
}: {
  readonly own: readonly Condition[];
  readonly onChange?: (conditions: readonly Condition[]) => void;
  readonly resolved?: ResolvedView;
  readonly note?: string;
  readonly names: readonly string[];
  readonly row?: FromValues;
  readonly valueOptions?: ValueOptions;
  /** The level these conditions are authored at. A condition from above can be removed for it. */
  readonly level: Level;
}) {
  const disabled = onChange === undefined;
  const replace = (index: number, next: Condition) =>
    onChange?.(own.map((condition, at) => (at === index ? next : condition)));
  const allNames = conditionOptions(names, "").map((value) => ({ value }));

  return (
    <div className="conditions">

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
            <ComboBox
              ariaLabel="Condition"
              placeholder="Condition"
              value={condition.condition}
              options={allNames}
              disabled={disabled}
              onChange={(name) => replace(index, { ...condition, condition: name })}
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
              title={HINTS[kindOf(condition)] ?? ""}
              disabled={disabled}
              onChange={(event) => replace(index, withKind(condition, event.target.value as Kind))}
            >
              {KINDS.filter(([kind]) => kind !== "from-name" || kindOf(condition) === "from-name").map(([kind, label]) => (
                <option key={kind} value={kind} title={HINTS[kind] ?? ""}>
                  {label}
                </option>
              ))}
            </select>
            <ValueEditor
              condition={condition}
              disabled={disabled}
              onChange={(next) => replace(index, next)}
              {...(row === undefined ? {} : { row })}
              {...(valueOptions?.[condition.condition] === undefined
                ? {}
                : { options: valueOptions[condition.condition] as readonly ValueOption[] })}
            />
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
            {resolved.conditions.length === 0 ? <span className="faint">Not drawn: no conditions yet.</span> : null}
            {resolved.conditions.map((condition) => (
              <div className="rline" key={`applied ${keyOf(condition)}`}>
                <span className="cond">{formatCondition(condition)}</span>
                <span className="origin">{appliedOrigin(condition, resolved.origins)}</span>
                {disabled || condition.level === level ? null : (
                  <button type="button" className="btn tiny ghost" onClick={() => onChange([...own, removal(condition)])}>
                    Remove for this {level}
                  </button>
                )}
              </div>
            ))}
            {resolved.removed.map((condition) => (
              <div className="rline gone" key={`removed ${keyOf(condition)}`}>
                <span className="cond">{formatCondition(condition)}</span>
                <span className="origin">{removedOrigin(condition, resolved.origins)}</span>
              </div>
            ))}
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
