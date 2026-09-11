import type { Condition } from "../../api/taxonomy/types.ts";
import type { Kind } from "../types.ts";

export const kindOf = (condition: Condition): Kind => {
  if (condition.from === "name") return "from-name";
  if (condition.from !== undefined) return "from-baseTypes";
  if (condition.value === null) return "remove";
  if (Array.isArray(condition.value)) return "list";
  if (typeof condition.value === "number") return "number";
  if (typeof condition.value === "boolean") return "flag";
  return "text";
};
