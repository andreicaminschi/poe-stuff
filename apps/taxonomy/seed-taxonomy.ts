import type { ClusterJewels } from "@poe/repoe/get-cluster-jewels.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { RepoeService } from "@poe/repoe/service";
import { clusterJewelVariants } from "./seed-taxonomy/cluster-jewels.ts";
import { gemVariants } from "./seed-taxonomy/gem-variants.ts";
import type { AuthoredVariant, TaxonomyTable, VariantTable } from "./types.ts";

/** What every seed is handed: the version's items, and the game's data, fetched once. */
export type SeedInputs = {
  readonly items: TaxonomyTable;
  readonly gems: Gems;
  readonly clusterJewels: ClusterJewels;
};

/** One class of item the game's data can describe well enough to write its variants. */
export type Seed = {
  readonly id: string;
  run(inputs: SeedInputs): VariantTable;
};

/**
 * Every seed there is. **This list is the seeding**: a new class is a new file beside this
 * one and a line here, and they all run every time — there is nothing to pick.
 */
export const SEEDS: readonly Seed[] = [
  { id: "gems", run: ({ items, gems }) => gemVariants(items, gems) },
  {
    id: "cluster-jewels",
    run: ({ clusterJewels }) => clusterJewelVariants(clusterJewels),
  },
];

export type Seeded = {
  readonly variants: VariantTable;
  /** How many keys each seed wrote, by seed id. */
  readonly counts: Readonly<Record<string, number>>;
};

/**
 * The whole seeded table, every seed at once.
 *
 * **Reads RePoE and nothing else.** A seed says what an item *is* — a gem's max level, a
 * jewel's enchants — and that is the game's data. What a listing costs is the catalog's
 * business, and the taxonomy never touches PoeWatch. The `price` selectors written here are
 * in PoeWatch's field names the way conditions are in GGG's: a vocabulary the catalog reads.
 *
 * Two seeds writing one key is a bug in the seeds, and throws rather than letting the later
 * one win. The table is rebuilt whole, so a key a seed stopped writing is gone.
 */
export async function seedTaxonomy(
  items: TaxonomyTable,
  repoe: RepoeService,
): Promise<Seeded> {
  const [gems, clusterJewels] = await Promise.all([
    repoe.getGems(),
    repoe.getClusterJewels(),
  ]);
  const inputs: SeedInputs = { items, gems, clusterJewels };

  const variants: Record<string, readonly AuthoredVariant[]> = {};
  const owner = new Map<string, string>();
  const counts: Record<string, number> = {};

  for (const seed of SEEDS) {
    const table = seed.run(inputs);

    for (const [key, list] of Object.entries(table)) {
      const before = owner.get(key);

      if (before !== undefined) {
        throw new Error(`seeds "${before}" and "${seed.id}" both wrote "${key}"`);
      }

      owner.set(key, seed.id);
      variants[key] = list;
    }

    counts[seed.id] = Object.keys(table).length;
  }

  return { variants, counts };
}
