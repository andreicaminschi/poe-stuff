import type { Item } from "../../api/taxonomy/types.ts";
import { useSession } from "../session-store.ts";

export function useSavedItem(): Item | undefined {
  return useSession((state) =>
    state.selectedKey === undefined ? undefined : state.saved?.items[state.selectedKey],
  );
}
