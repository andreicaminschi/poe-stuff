import type { VersionSummary } from "../../api/taxonomy/getVersions.api.ts";
import { useSession } from "../session-store.ts";

export function useCurrentVersion(): VersionSummary | undefined {
  const versions = useSession((state) => state.versions);
  const versionId = useSession((state) => state.versionId);

  return versions?.versions.find((version) => version.id === versionId);
}
