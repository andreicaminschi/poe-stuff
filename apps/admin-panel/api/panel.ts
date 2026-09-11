import { buildCatalog } from "./catalog/build.api.ts";
import { getRuns } from "./catalog/getRuns.api.ts";
import { publishCatalog } from "./catalog/publish.api.ts";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { appendLedger } from "./ledger/append.api.ts";
import { commitLedger } from "./ledger/commit.api.ts";
import { getLedger } from "./ledger/get.api.ts";
import { popLedger } from "./ledger/pop.api.ts";
import type { PanelApi } from "./panel-api.ts";
import { getPriceNames } from "./prices/getNames.api.ts";
import { createVersion } from "./taxonomy/create.api.ts";
import { getVersion } from "./taxonomy/getVersion.api.ts";
import { getVersions } from "./taxonomy/getVersions.api.ts";
import { promoteVersion } from "./taxonomy/promote.api.ts";
import { publishVersion } from "./taxonomy/publish.api.ts";
import { resolveCategory, resolveItem } from "./taxonomy/resolve.api.ts";
import { saveDraft } from "./taxonomy/saveDraft.api.ts";
import { validate } from "./taxonomy/validate.api.ts";
import type { ActionResult } from "./util/yarn.ts";

export function createPanelService(repo: string): PanelApi {
  const lake = createLakeService({ root: join(repo, ".s3") });
  let building = false;

  return {
    getVersions: () => getVersions(lake),
    getVersion: (id) => getVersion(lake, id),
    saveDraft: (id, changes) => saveDraft(lake, id, changes),
    validate: (id) => validate(repo, id),
    resolveItem: (id, key) => resolveItem(repo, id, key),
    resolveCategory: (id, path) => resolveCategory(repo, id, path),
    createVersion: (parent) => createVersion(repo, parent),
    publishVersion: (id) => publishVersion(repo, id),
    promoteVersion: (id) => promoteVersion(repo, id),
    getRuns: () => getRuns(lake),

    async buildCatalog(league, force): Promise<ActionResult> {
      if (building) return { ok: false, log: "A build is already running." };

      building = true;
      try {
        return await buildCatalog(repo, league, force);
      } finally {
        building = false;
      }
    },

    publishCatalog: (league, hour) => publishCatalog(repo, league, hour),
    getPriceNames,
    getLedger: (id) => getLedger(lake, id),
    appendLedger: (id, entry) => appendLedger(lake, id, entry),
    popLedger: (id, seq) => popLedger(lake, id, seq),
    commitLedger: (id) => commitLedger(lake, id),
  };
}
