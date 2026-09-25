import { buildCatalog } from "./catalog/build.api.ts";
import { getRuns } from "./catalog/getRuns.api.ts";
import { publishCatalog } from "./catalog/publish.api.ts";
import { compileFilter } from "./filter/compile.api.ts";
import { saveReport } from "./filter/saveReport.api.ts";
import { validateFilter } from "./filter/validateFilter.api.ts";
import { join } from "node:path";
import { createLakeService } from "@poe/lake/service";
import { appendLedger } from "./ledger/append.api.ts";
import { commitLedger } from "./ledger/commit.api.ts";
import { getLedger } from "./ledger/get.api.ts";
import { popLedger } from "./ledger/pop.api.ts";
import type { PanelApi } from "./panel-api.ts";
import { getForms } from "./prices/getForms.api.ts";
import { getCorruptionNames, getExchangeNames, getListingNames } from "./prices/getNames.api.ts";
import { createPoeWatchService } from "@poe/poe-watch/service";
import type { CachedResponse } from "@poe/poe-watch/types";
import { fileCache } from "@util/cache/file-cache";
import { LEAGUE } from "./panel-api.ts";
import { createVersion } from "./taxonomy/create.api.ts";
import { getVersion } from "./taxonomy/getVersion.api.ts";
import { getVersions } from "./taxonomy/getVersions.api.ts";
import { promoteVersion } from "./taxonomy/promote.api.ts";
import { publishVersion } from "./taxonomy/publish.api.ts";
import { saveDraft } from "./taxonomy/saveDraft.api.ts";
import { validate } from "./taxonomy/validate.api.ts";
import type { ActionResult } from "./util/yarn.ts";

export function createPanelService(
  repo: string,
  documents: string,
  chooseReportPath: () => Promise<string | undefined>,
  userAgent?: string,
): PanelApi {
  const lake = createLakeService({ root: join(repo, ".s3") });
  const poeWatch = createPoeWatchService({
    ...(userAgent === undefined ? {} : { userAgent }),
    cache: fileCache<CachedResponse>(join(repo, ".s3", ".cache")),
  });
  let building = false;

  return {
    getVersions: () => getVersions(lake),
    getVersion: (id) => getVersion(lake, id),
    saveDraft: (id, changes) => saveDraft(lake, id, changes),
    validate: (id, changes) => validate(repo, lake, id, changes),
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
    getListingNames: () => getListingNames(poeWatch, LEAGUE),
    getExchangeNames: () => getExchangeNames(poeWatch, LEAGUE),
    getCorruptionNames: () => getCorruptionNames(poeWatch, LEAGUE),
    getForms: (name) => getForms(poeWatch, LEAGUE, name),
    getLedger: (id) => getLedger(lake, id),
    appendLedger: (id, entry) => appendLedger(lake, id, entry),
    popLedger: (id, seq) => popLedger(lake, id, seq),
    commitLedger: (id) => commitLedger(lake, id),
    compileFilter: (id, changes) => compileFilter(repo, lake, id, documents, changes),
    validateFilter: (id, changes) => validateFilter(repo, lake, id, changes),
    saveReport: (report) => saveReport(report, chooseReportPath),
  };
}
