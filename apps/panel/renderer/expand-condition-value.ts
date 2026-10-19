import { VALUE_SETS } from "@poe/panel-state/value-sets";

/** A value set name becomes its values; anything else stays one literal. */
export const expandConditionValue = (condition: string, value: string): readonly string[] =>
  VALUE_SETS[condition]?.[value] ?? [value];
