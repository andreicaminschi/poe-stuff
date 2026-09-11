import type { Condition, ConditionValue } from "../../api/taxonomy/types.ts";
import { kindOf } from "../utils/kind-of.ts";
import { ListValue } from "./list-value.tsx";

export function ValueEditor({
  condition,
  onChange,
  disabled,
}: {
  readonly condition: Condition;
  readonly onChange: (condition: Condition) => void;
  readonly disabled: boolean;
}) {
  const set = (value: ConditionValue) => onChange({ ...condition, value });

  switch (kindOf(condition)) {
    case "text":
      return (
        <input
          type="text"
          value={typeof condition.value === "string" ? condition.value : ""}
          disabled={disabled}
          onChange={(event) => set(event.target.value)}
        />
      );
    case "number":
      return (
        <input
          type="text"
          inputMode="numeric"
          className="mono"
          value={typeof condition.value === "number" ? String(condition.value) : ""}
          disabled={disabled}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (event.target.value.trim() !== "" && Number.isFinite(parsed)) set(parsed);
          }}
        />
      );
    case "flag":
      return (
        <select
          value={condition.value === true ? "true" : "false"}
          disabled={disabled}
          onChange={(event) => set(event.target.value === "true")}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    case "list":
      return (
        <ListValue
          value={Array.isArray(condition.value) ? condition.value : []}
          disabled={disabled}
          onChange={(value) => set(value)}
        />
      );
    case "from-name":
      return <span className="frozen">the row's own name</span>;
    case "from-baseTypes":
      return <span className="frozen">the row's base types</span>;
    case "remove":
      return <span className="frozen removed">removes it from the levels above</span>;
  }
}
