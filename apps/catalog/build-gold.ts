import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
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

/** What silver calls the file holding a category's drawable rows. */
const FILTERABLE = ".filterable.json";

/**
 * Silver, gathered into the two files the generator reads.
 *
 * `catalog.json` is every filterable row in one array — silver's split by category is a
 * browsing convenience, and the generator wants one file. `catalog.categories.json` is the
 * taxonomy's flattened category tree, copied out of bronze.
 *
 * **Nothing here is resolved.** A row carries the conditions authored for it and the
 * categories file carries the levels above it, and laying one over the other is the
 * generator's job. Doing it here would bake one reading of the tables into an artifact that
 * outlives them, and the catalog does not write filters.
 *
 * The categories come from bronze rather than from the lake, because the run pinned a
 * taxonomy version: reading `latest` again could hand the generator a table this run never
 * used.
 */
export const buildGold: Step = {
  id: "build-gold",
  stage: "gold",

  async run({ lake, runId }) {
    const manifest = await lake.readJson<Manifest>(manifestKey(runId));
    const silver = manifest.stages.silver;

    if (silver === undefined) {
      throw new Error(`${runId} has no silver stage to gather`);
    }

    // The manifest already records every key silver wrote, so gold needs no way to list the
    // lake — it reads back exactly what the stage before it said it produced.
    const keys = silver.steps
      .flatMap((step) => step.keys)
      .filter((key) => key.endsWith(FILTERABLE));

    const rows: Item[] = [];
    for (const key of keys) rows.push(...(await lake.readJson<Item[]>(key)));

    const taxonomy = await lake.readJson<Taxonomy>(
      bronzeKey(runId, BRONZE_FILES.taxonomy),
    );

    // A run collected before the taxonomy carried conditions has no table here, and bronze
    // is skipped on a replay, so the validator that would have caught it never ran. Writing
    // the missing value would hand the generator a file saying `undefined`.
    if (taxonomy.categories === undefined) {
      throw new Error(
        `${runId}: bronze holds taxonomy ${taxonomy.version} with no categories. Collect the run again.`,
      );
    }

    rows.sort(
      (a, b) => (a.name ?? a.key).localeCompare(b.name ?? b.key) ||
        a.key.localeCompare(b.key),
    );

    await lake.clear(goldPrefix(runId));

    const written: string[] = [];

    for (const [file, value] of [
      [GOLD_FILES.catalog, rows],
      [GOLD_FILES.categories, taxonomy.categories],
    ] as const) {
      const key = goldKey(runId, file);
      await lake.writeJson(key, value);
      written.push(key);
    }

    return { keys: written, rows: rows.length };
  },
};
