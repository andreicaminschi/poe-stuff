import type { StateCommand } from "../commands.ts";
import type { ConditionValue } from "../types.ts";

type Patch = { readonly conditions?: Readonly<Record<string, readonly ConditionValue[]>> };

const writeValue = (value: ConditionValue): string => (Array.isArray(value)
  ? `${String(value[0])}-${String(value[1])}`
  : String(value));

/** Writes the step's JSON with one condition's values replaced by the kept ones. Low, Sonar 1. */
function rewriteStep(text: string, condition: string, kept: readonly ConditionValue[]): string {
  const step = JSON.parse(text) as { add?: { conditions?: Record<string, unknown> } };
  const conditions = { ...step.add?.conditions, [condition]: kept };
  return JSON.stringify({ ...step, add: { ...step.add, conditions } }, undefined, 2);
}

/**
 * The values code filled in for each added condition, as toggles. Unticking a value writes
 * the kept ones back into the step's JSON, in place of the sentinel.
 */
export function ConditionToggles({ step, text, expanded, onChange }: {
  readonly step: StateCommand;
  readonly text: string;
  readonly expanded: Readonly<Record<string, readonly ConditionValue[]>>;
  readonly onChange: (text: string) => void;
}) {
  const conditions = ("add" in step ? (step.add as Patch | undefined)?.conditions : undefined) ?? {};
  const entries = Object.entries(conditions);
  if (entries.length === 0) return null;

  return (
    <div className="plan-toggles">
      {entries.map(([condition, kept]) => {
        const all = expanded[condition] ?? kept;
        const keys = new Set(kept.map(writeValue));
        return (
          <div className="plan-toggle-row" key={condition}>
            <span className="k">{condition}</span>
            {all.map((value) => (
              <label key={writeValue(value)}>
                <input
                  type="checkbox"
                  checked={keys.has(writeValue(value))}
                  onChange={(event) => onChange(rewriteStep(text, condition, event.target.checked
                    ? all.filter((at) => keys.has(writeValue(at)) || writeValue(at) === writeValue(value))
                    : kept.filter((at) => writeValue(at) !== writeValue(value))))}
                />
                {writeValue(value)}
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
