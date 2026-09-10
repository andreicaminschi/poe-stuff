import { useSession } from "../session-store.ts";
import { changeCount } from "../utils/change-count.ts";

export function useDirty(): number {
  return useSession((state) => changeCount(state.changes));
}
