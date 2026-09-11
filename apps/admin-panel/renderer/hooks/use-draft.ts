import { useMemo } from "react";
import type { Draft } from "../../api/taxonomy/types.ts";
import { useSession } from "../session-store.ts";
import { applyChanges } from "../utils/apply-changes.ts";

export function useDraft(): Draft | undefined {
  const saved = useSession((state) => state.saved);
  const changes = useSession((state) => state.changes);

  return useMemo(() => (saved === undefined ? undefined : applyChanges(saved, changes)), [saved, changes]);
}
