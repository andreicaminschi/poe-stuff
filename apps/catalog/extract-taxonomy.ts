import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractTaxonomy: Step = {
  id: "taxonomy",
  stage: "bronze",
  source: "taxonomy",

  async run({ lake, runId, taxonomy, taxonomyVersion }) {
    const published = await taxonomy.getTaxonomy(taxonomyVersion);
    const categories = await taxonomy.getCategories(published.version);
    const keys = [
      bronzeKey(runId, BRONZE_FILES.taxonomy),
      bronzeKey(runId, BRONZE_FILES.taxonomyCategories),
    ];

    await lake.writeJson(keys[0] as string, published);
    await lake.writeJson(keys[1] as string, categories);

    return { keys, rows: Object.keys(published.items).length };
  },
};
