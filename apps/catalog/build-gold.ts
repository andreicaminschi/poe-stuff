import type { TaxonomyCategories } from "@poe/taxonomy/get-categories.types";
import { UNPRICED } from "./build-silver.ts";
import type { Item } from "./item.ts";
import {
  BRONZE_FILES,
  bronzeKey,
  GOLD_FILES,
  goldKey,
  goldPrefix,
  manifestKey,
} from "./lake/keys.ts";
import type { Manifest, Step } from "./types.ts";

export const buildGold: Step = {
  id: "build-gold",
  stage: "gold",

  async run({ lake, runId }) {
    const manifest = await lake.readJson<Manifest>(manifestKey(runId));
    const silver = manifest.stages.silver;

    if (silver === undefined) {
      throw new Error(`${runId} has no silver stage to gather`);
    }

    const keys = silver.steps
      .flatMap((step) => step.keys)
      .filter((key) => !key.endsWith(UNPRICED));

    const rows: Item[] = [];
    for (const key of keys) rows.push(...(await lake.readJson<Item[]>(key)));

    const categoriesKey = bronzeKey(runId, BRONZE_FILES.taxonomyCategories);

    if (!(await lake.exists(categoriesKey))) {
      throw new Error(
        `${runId}: bronze has no taxonomy categories file. Collect again with --force=taxonomy.`,
      );
    }

    const { categories } = await lake.readJson<TaxonomyCategories>(categoriesKey);

    rows.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));

    await lake.clear(goldPrefix(runId));

    const catalogKey = goldKey(runId, GOLD_FILES.catalog);
    const goldCategoriesKey = goldKey(runId, GOLD_FILES.categories);

    await lake.writeJson(catalogKey, rows);
    await lake.writeJson(goldCategoriesKey, categories);

    return { keys: [catalogKey, goldCategoriesKey], rows: rows.length };
  },
};
