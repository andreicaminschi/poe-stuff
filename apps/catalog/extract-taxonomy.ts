import { BRONZE_FILES, bronzeKey } from "./lake/keys.ts";
import type { Step } from "./types.ts";

export const extractTaxonomy: Step = {
  id: "taxonomy",
  stage: "bronze",
  source: "taxonomy",

  async run({ lake, runId, taxonomy, taxonomyVersion }) {
    const published = await taxonomy.getTaxonomy(taxonomyVersion);
    const categories = await taxonomy.getCategories(published.version);
    const itemsKey = bronzeKey(runId, BRONZE_FILES.taxonomy);
    const categoriesKey = bronzeKey(runId, BRONZE_FILES.taxonomyCategories);

    await lake.writeJson(itemsKey, published);
    await lake.writeJson(categoriesKey, categories);

    return { keys: [itemsKey, categoriesKey], rows: Object.keys(published.items).length };
  },
};
