import { useMemo } from "react";
import { FILTER_CLASSES } from "@poe/filter-eval/filter-classes";
import type { ValueOptions } from "../types.ts";
import { baseTypeOptions } from "../utils/base-type-options.ts";
import { useDraft } from "./use-draft.ts";

const CLASSES = FILTER_CLASSES.map((value) => ({ value }));

export function useValueOptions(): ValueOptions {
  const draft = useDraft();

  return useMemo(
    () => ({ Class: CLASSES, BaseType: draft === undefined ? [] : baseTypeOptions(draft) }),
    [draft],
  );
}
