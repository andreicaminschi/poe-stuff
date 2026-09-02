import type { ClusterJewels } from "@poe/repoe/get-cluster-jewels.types";
import type { Gems } from "@poe/repoe/get-gems.types";
import type { RepoeService } from "@poe/repoe/service";
import { clusterJewelVariants } from "./seed-taxonomy/cluster-jewels.ts";
import { gemVariants } from "./seed-taxonomy/gem-variants.ts";
import type {
  AuthoredRow,
  AuthoredTable,
  AuthoredVariant,
  TaxonomyTable,
  VariantTable,
} from "./types.ts";

/** What every seed is handed: the version's items, and the game's data, fetched once. */
export type SeedInputs = {
  readonly items: TaxonomyTable;
  readonly gems: Gems;
  readonly clusterJewels: ClusterJewels;
};

/** What one seed wrote: variants on rows that exist, or rows that no source produces. */
export type SeedOutput = {
  readonly variants?: VariantTable;
  readonly authored?: AuthoredTable;
};

/** One class of item the game's data can describe well enough to write it. */
export type Seed = {
  readonly id: string;
  run(inputs: SeedInputs): SeedOutput;
};

/**
 * Every seed there is. **This list is the seeding**: a new class is a new file beside this
 * one and a line here, and they all run every time — there is nothing to pick.
 */
export const SEEDS: readonly Seed[] = [
  { id: "gems", run: ({ items, gems }) => ({ variants: gemVariants(items, gems) }) },
  {
    id: "cluster-jewels",
    run: ({ clusterJewels }) => ({ variants: clusterJewelVariants(clusterJewels) }),
  },
];

export type SeedCount = { readonly variants: number; readonly authored: number };

export type Seeded = {
  readonly variants: VariantTable;
  readonly authored: AuthoredTable;
  /** How many keys each seed wrote to each table, by seed id. */
  readonly counts: Readonly<Record<string, SeedCount>>;
};

/**
 * The whole seeded tables, every seed at once.
 *
 * **Reads RePoE and nothing else.** A seed says what an item *is* — a gem's max level, a
 * jewel's enchants — and that is the game's data. What a listing
 * costs is the catalog's business, and the taxonomy never touches PoeWatch. The `price`
 * selectors written here are in PoeWatch's field names the way conditions are in GGG's: a
 * vocabulary the catalog reads.
 *
 * Two seeds may write variants on one key — a cluster jewel base carries the enchant forms
 * and another seed's forms both — and their lists are joined in seed order; a name two seeds
 * both wrote is a repeat, and the validator refuses it when the file is read back. Two seeds
 * writing one authored row is a bug, and throws: a row cannot be joined. Both tables are
 * rebuilt whole, so a key a seed stopped writing is gone.
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
  const authored: Record<string, AuthoredRow> = {};
  const owner = new Map<string, string>();
  const counts: Record<string, SeedCount> = {};

  for (const seed of SEEDS) {
    const output = seed.run(inputs);

    for (const [key, list] of Object.entries(output.variants ?? {})) {
      variants[key] = [...(variants[key] ?? []), ...list];
    }

    for (const [key, row] of Object.entries(output.authored ?? {})) {
      const before = owner.get(key);

      if (before !== undefined) {
        throw new Error(`seeds "${before}" and "${seed.id}" both wrote row "${key}"`);
      }

      owner.set(key, seed.id);
      authored[key] = row;
    }

    counts[seed.id] = {
      variants: Object.keys(output.variants ?? {}).length,
      authored: Object.keys(output.authored ?? {}).length,
    };
  }

  return { variants, authored, counts };
}
