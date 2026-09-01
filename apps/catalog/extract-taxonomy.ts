import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

/**
 * The classification table, copied into the run that used it.
 *
 * **Copied rather than referenced.** `latest` moves whenever a version is promoted, so a
 * replay that resolved it again could classify against a table the first run never saw. The
 * version travels inside the file, which makes the copy the record of what this run meant.
 *
 * Where it is read from is the store the service was built with: files under the same lake
 * on a laptop, an object in a bucket over HTTPS once deployed. Neither is visible here.
 */
export const extractTaxonomy: Step = {
  id: "taxonomy",
  stage: "bronze",

  async run({ lake, runId, taxonomy, taxonomyVersion }) {
    const published = await taxonomy.getTaxonomy(taxonomyVersion);
    const key = bronzeKey(runId, BRONZE_FILES.taxonomy);

    await lake.writeJson(key, published);

    return { keys: [key], rows: Object.keys(published.items).length };
  },
};
