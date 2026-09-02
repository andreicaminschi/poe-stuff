import type { ClusterJewels } from "@poe/repoe/get-cluster-jewels.types";
import type { AuthoredVariant, Condition, VariantTable } from "../types.ts";

/**
 * PoeWatch's item level buckets, as it labels them and as a filter has to ask for them.
 *
 * A convention of the market, not of the game, written here because the `price` selector
 * speaks PoeWatch's vocabulary and the bucket is the value it takes.
 */
const ITEM_LEVELS: readonly {
  readonly bucket: number;
  readonly conditions: readonly Condition[];
}[] = [
  { bucket: 1, conditions: [{ condition: "ItemLevel", operator: "<=", value: 49 }] },
  {
    bucket: 50,
    conditions: [
      { condition: "ItemLevel", operator: ">=", value: 50 },
      { condition: "ItemLevel", operator: "<=", value: 67 },
    ],
  },
  {
    bucket: 68,
    conditions: [
      { condition: "ItemLevel", operator: ">=", value: 68 },
      { condition: "ItemLevel", operator: "<=", value: 74 },
    ],
  },
  {
    bucket: 75,
    conditions: [
      { condition: "ItemLevel", operator: ">=", value: 75 },
      { condition: "ItemLevel", operator: "<=", value: 83 },
    ],
  },
  { bucket: 84, conditions: [{ condition: "ItemLevel", operator: ">=", value: 84 }] },
];

/** PoeWatch's passive-count buckets per size. `9-11` is one bucket and a range. */
const PASSIVES: Readonly<Record<string, readonly string[]>> = {
  Small: ["2", "3"],
  Medium: ["4", "5", "6"],
  Large: ["8", "9-11", "12"],
};

/** `EnchantmentPassiveNum` for one bucket: a number, or both ends of a range. */
function passivesConditions(passives: string): readonly Condition[] {
  const [lo, hi] = passives.split("-").map(Number);

  return hi === undefined
    ? [{ condition: "EnchantmentPassiveNum", operator: "==", value: lo }]
    : [
        { condition: "EnchantmentPassiveNum", operator: ">=", value: lo },
        { condition: "EnchantmentPassiveNum", operator: "<=", value: hi },
      ];
}

/**
 * Every enchant a cluster jewel can carry, crossed with how many passives it adds and what
 * item level it dropped at, as variants on the three real rows.
 *
 * The enchant is a form of the jewel the way a level is a form of a gem, so it is a variant
 * and not a row. `EnchantmentPassiveNode` takes the passive's name, and PoeWatch lists a
 * jewel under the enchant's mod text; RePoE pairs the two, so the listing name is written
 * here from `stat_text`, in RePoE's line order. The catalog knows PoeWatch writes a two-line
 * enchant the other way round.
 *
 * A size RePoE names that the bucket table does not know throws: a fourth size is a new
 * convention to learn, not three sizes' worth of variants to silently skip.
 */
export function clusterJewelVariants(jewels: ClusterJewels): VariantTable {
  const table: Record<string, readonly AuthoredVariant[]> = {};

  for (const [id, size] of Object.entries(jewels)) {
    const buckets = PASSIVES[size.size];

    if (buckets === undefined) {
      throw new Error(`cluster jewel ${id}: no passive buckets for size "${size.size}"`);
    }

    const variants: AuthoredVariant[] = [];

    for (const passive of size.passive_skills) {
      const listing = `${size.name} (${passive.stat_text.join("\n")})`;

      for (const passives of buckets) {
        for (const { bucket, conditions } of ITEM_LEVELS) {
          variants.push({
            name: `${passive.name}, ${passives} passives, ilvl ${bucket}`,
            conditions: [
              { condition: "EnchantmentPassiveNode", value: [passive.name] },
              ...passivesConditions(passives),
              ...conditions,
            ],
            price: { name: listing, passives, itemLevel: bucket },
          });
        }
      }
    }

    table[id] = variants;
  }

  return table;
}
