import { useSession } from "../session-store.ts";
import { useCurrentVersion } from "./use-current-version.ts";

export function useEditable(): boolean {
  const version = useCurrentVersion();
  const loaded = useSession((state) => state.saved?.id === state.versionId);

  return version?.editable === true && loaded;
}
