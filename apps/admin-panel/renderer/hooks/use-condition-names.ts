import { useMemo } from "react";
import { conditionNames } from "../utils/condition-names.ts";
import { useDraft } from "./use-draft.ts";

export function useConditionNames(): readonly string[] {
  const draft = useDraft();

  return useMemo(() => (draft === undefined ? [] : conditionNames(draft)), [draft]);
}
