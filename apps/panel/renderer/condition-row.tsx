import type { ConditionOperator, ConditionValues } from "@poe/panel-state/types";
import { Fragment } from "react";
import { ChipList } from "./chip-list.tsx";
import { nameOperator } from "./operator-names.ts";
import { ValueAdder } from "./value-adder.tsx";

type ConditionRowProps = {
  readonly condition: string;
  readonly values: ConditionValues;
  readonly split: boolean;
  readonly onValues: (values: ConditionValues) => void;
  readonly onSplit: (split: boolean) => void;
  readonly onRemove: () => void;
};

/** One condition as grid lines: name, operator, values, actions. One line per operator. */
export function ConditionRow({ condition, values, split, onValues, onSplit, onRemove }: ConditionRowProps) {
  const byOperator = Map.groupBy(Object.entries(values), ([, operator]) => operator);
  const groups: readonly (readonly [ConditionOperator | undefined, readonly string[]])[] = byOperator.size === 0
    ? [[undefined, []]]
    : [...byOperator].map(([operator, entries]) => [operator, entries.map(([value]) => value)]);
  const keep = (dropped: readonly string[]): void =>
    onValues(Object.fromEntries(Object.entries(values).filter(([value]) => !dropped.includes(value))));

  return groups.map(([operator, groupValues], index) => (
    <Fragment key={operator ?? ""}>
      <span className="mono condition-name">
        {index === 0
          ? condition
          : ""}
      </span>
      <span>
        {operator === undefined
          ? null
          : <span className="chip outline op">{nameOperator(operator, condition)}</span>}
      </span>
      <ChipList
        values={groupValues}
        placeholder={`Add ${condition} value`}
        adder={index === groups.length - 1
          ? <ValueAdder condition={condition} onAdd={(value, added) => onValues({ ...values, [value]: added })} />
          : <></>}
        onChange={(kept) => keep(groupValues.filter((value) => !kept.includes(value)))}
      />
      <span className="condition-actions">
        {index === 0
          ? (
              <>
                <label className="check">
                  <input type="checkbox" checked={split} onChange={(event) => onSplit(event.target.checked)} />
                  split
                </label>
                <button type="button" className="btn tiny ghost danger" aria-label={`Remove ${condition}`} onClick={onRemove}>×</button>
              </>
            )
          : null}
      </span>
    </Fragment>
  ));
}
