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

    const written: string[] = [];

    for (const [file, value] of [
      [GOLD_FILES.catalog, rows],
      [GOLD_FILES.categories, categories],
    ] as const) {
      const key = goldKey(runId, file);
      await lake.writeJson(key, value);
      written.push(key);
    }

    return { keys: written, rows: rows.length };
  },
};
