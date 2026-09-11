import { useMemo } from "react";
import type { Item } from "../../api/taxonomy/types.ts";
import { useSession } from "../session-store.ts";
import { rowsIn } from "../utils/rows-in.ts";
import { useDraft } from "./use-draft.ts";

export function useRows(): readonly Item[] {
  const draft = useDraft();
  const selection = useSession((state) => state.selection);
  const view = useSession((state) => state.view);

  return useMemo(() => (draft === undefined ? [] : rowsIn(draft, selection, view)), [draft, selection, view]);
}
