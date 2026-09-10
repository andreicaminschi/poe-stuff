import { useMemo } from "react";
import type { Item } from "../../api/taxonomy.types.ts";
import { useSession } from "../session-store.ts";
import { rowsIn } from "../utils/rows-in.ts";
import { useDraft } from "./use-draft.ts";

export function useRows(): readonly Item[] {
  const draft = useDraft();
  const selection = useSession((state) => state.selection);

  return useMemo(() => (draft === undefined ? [] : rowsIn(draft, selection)), [draft, selection]);
}
