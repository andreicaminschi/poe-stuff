import { useState } from "react";
import { CONDITIONS, type ConditionName } from "@poe/filter-eval/filter-ast";
import type { ConditionValue } from "../types.ts";
import { ChipList } from "./chip-list.tsx";

type Range = readonly [number, number];

/** Reads the kind of a known condition, else undefined. Low, Sonar 1. */
export function readKind(key: string): string | undefined {
  return key in CONDITIONS
    ? CONDITIONS[key as ConditionName].kind
    : undefined;
}

/** Reads the closed value set of a condition: the rarity ladder or an enum's values. Low, Sonar 1. */
function readChoices(key: string): readonly string[] | undefined {
  if (!(key in CONDITIONS)) return undefined;
  const condition = CONDITIONS[key as ConditionName];

  if ("order" in condition) return condition.order;
  if ("values" in condition) return condition.values;
  return undefined;
}

/** Toggles one value in or out of a list, keeping the list's order. Low, Sonar 1. */
function toggle<T>(values: readonly T[], value: T): readonly T[] {
  return values.includes(value)
    ? values.filter((at) => at !== value)
    : [...values, value];
}

function Checks<T extends string | boolean>({
  choices,
  values,
  onChange,
}: {
  readonly choices: readonly T[];
  readonly values: readonly ConditionValue[];
  readonly onChange: (values: readonly ConditionValue[]) => void;
}) {
  return (
    <div className="checks">
      {choices.map((choice) => (
        <label key={String(choice)}>
          <input type="checkbox" checked={values.includes(choice)} onChange={() => onChange(toggle(values, choice))} />
          {String(choice)}
        </label>
      ))}
    </div>
  );
}

function NumberInput({ value, onChange }: { readonly value: number; readonly onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));

  return (
    <input
      type="text"
      inputMode="numeric"
      className="num"
      value={text}
      onChange={(event) => {
        const next = event.target.value.replace(/[^0-9]/g, "");
        setText(next);
        if (next !== "") onChange(Number(next));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

function Ranges({ values, onChange }: { readonly values: readonly ConditionValue[]; readonly onChange: (values: readonly ConditionValue[]) => void }) {
  const ranges = values.filter((value): value is Range => typeof value === "object");
  const setAt = (at: number, next: Range) => onChange(ranges.map((range, index) => (index === at
    ? next
    : range)));

  return (
    <div className="ranges">
      {ranges.map(([low, high], at) => (
        <div className="range" key={at}>
          <NumberInput value={low} onChange={(next) => setAt(at, [next, high])} />
          <span className="faint">to</span>
          <NumberInput value={high} onChange={(next) => setAt(at, [low, next])} />
          <button type="button" className="btn x" aria-label="Remove range" onClick={() => onChange(ranges.filter((_, index) => index !== at))}>×</button>
        </div>
      ))}
      <div>
        <button type="button" className="btn tiny ghost" onClick={() => onChange([...ranges, [0, 0]])}>+ Range</button>
      </div>
    </div>
  );
}

/** The value editor for one condition, picked by the kind the game gives its key. */
export function ValueEditor({
  conditionKey,
  values,
  onChange,
}: {
  readonly conditionKey: string;
  readonly values: readonly ConditionValue[];
  readonly onChange: (values: readonly ConditionValue[]) => void;
}) {
  const kind = readKind(conditionKey);
  const choices = readChoices(conditionKey);

  if (kind === undefined) return <div className="none">None</div>;
  if (kind === "boolean") return <Checks choices={[true, false]} values={values} onChange={onChange} />;
  if (kind === "numeric") return <Ranges values={values} onChange={onChange} />;
  if (choices !== undefined) return <Checks choices={choices} values={values} onChange={onChange} />;

  return (
    <ChipList
      values={values.filter((value): value is string => typeof value === "string")}
      placeholder="Add value"
      onChange={onChange}
    />
  );
}
