import type { Item } from "../../api/taxonomy/types.ts";
import { useSession } from "../session-store.ts";
import { useDraft } from "./use-draft.ts";

export function useSelectedItem(): Item | undefined {
  const draft = useDraft();
  const key = useSession((state) => state.selectedKey);

  return key === undefined ? undefined : draft?.items[key];
}
