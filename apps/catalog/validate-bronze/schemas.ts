import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { CurrencyExchange } from "@poe/ggg/fetch-currency-hour.types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { CorruptionOutcome, ExchangeRatioPrice } from "@poe/poe-watch/types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
import type { BaseItem, ClusterJewel, ClusterJewelPassive, Essence, Gem } from "@poe/repoe/types";
import type { TaxonomyCategories } from "@poe/taxonomy/get-categories.types";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { z } from "zod";
import { BRONZE_FILES } from "../lake/keys.ts";

const gggItem = z.discriminatedUnion("kind", [
  z.looseObject({
    kind: z.literal("unique"),
    name: z.string(),
    baseType: z.string(),
    displayText: z.string(),
  }),
  z.looseObject({
    kind: z.literal("base"),
    baseType: z.string(),
  }),
]);

const gggItems = z
  .array(
    z.looseObject({
      id: z.string(),
      label: z.string(),
      items: z.array(gggItem),
    }),
  )
  .min(1, "the item list has no groups") satisfies z.ZodType<
  readonly GGGItemGroup[]
>;

const side = z.record(z.string(), z.number());

const currencyHour = z.looseObject({
  next_change_id: z.number(),
  markets: z.array(
    z.looseObject({
      league: z.string(),
      market_id: z.string(),
      market_pair: z.tuple([z.string(), z.string()]),
      volume_traded: side,
      lowest_stock: side,
      highest_stock: side,
      lowest_ratio: side,
      highest_ratio: side,
    }),
  ),
}) satisfies z.ZodType<CurrencyExchange>;

type ValidatedCompactItem = Pick<ItemData, "id" | "name"> & {
  readonly category: string;
};

const poeWatchCompact = z
  .array(
    z.looseObject({
      id: z.number(),
      name: z.string(),
      category: z.string(),
    }),
  )
  .min(1, "the compact dump has no items") satisfies z.ZodType<
  readonly ValidatedCompactItem[]
>;

type ValidatedRatio = Pick<ExchangeRatioItem, "name" | "category"> & {
  readonly price?: Pick<ExchangeRatioPrice, "chaos">;
};

const poeWatchRatios = z
  .array(
    z.looseObject({
      name: z.string(),
      category: z.string(),
      price: z.looseObject({ chaos: z.number() }).optional(),
    }),
  )
  .min(1, "the exchange has no items") satisfies z.ZodType<
  readonly ValidatedRatio[]
>;

type ValidatedCorruptions = Pick<ItemCorruptions, "item_id"> & {
  readonly corruptions: readonly Pick<CorruptionOutcome, "name" | "mean">[];
};

const poeWatchCorruptions = z.array(
  z.looseObject({
    item_id: z.number(),
    corruptions: z.array(
      z.looseObject({ name: z.string(), mean: z.number() }),
    ),
  }),
) satisfies z.ZodType<readonly ValidatedCorruptions[]>;

type ValidatedBaseItem = Pick<
  BaseItem,
  "name" | "item_class" | "release_state" | "tags" | "visual_identity"
>;

const repoeBaseItems = z
  .record(
    z.string(),
    z.looseObject({
      name: z.string(),
      item_class: z.string(),
      release_state: z.string(),
      tags: z.array(z.string()),
      visual_identity: z.looseObject({
        dds_file: z.string(),
        id: z.string(),
      }),
    }),
  )
  .refine(
    (items) => Object.keys(items).length > 0,
    "the base item export is empty",
  ) satisfies z.ZodType<Record<string, ValidatedBaseItem>>;

const namedRecord = (what: string) =>
  z
    .record(z.string(), z.looseObject({ name: z.string() }))
    .refine((rows) => Object.keys(rows).length > 0, `the ${what} export is empty`);

const gems = namedRecord("gem") satisfies z.ZodType<
  Record<string, Pick<Gem, "name">>
>;

const essences = namedRecord("essence") satisfies z.ZodType<
  Record<string, Pick<Essence, "name">>
>;

type ValidatedClusterJewel = Pick<ClusterJewel, "name"> & {
  readonly passive_skills: readonly Pick<ClusterJewelPassive, "name" | "stat_text">[];
};

const repoeClusterJewels = z
  .record(
    z.string(),
    z.looseObject({
      name: z.string(),
      passive_skills: z.array(
        z.looseObject({ name: z.string(), stat_text: z.array(z.string()).min(1) }),
      ),
    }),
  )
  .refine(
    (sizes) => Object.keys(sizes).length === 3,
    "the cluster jewel export does not hold exactly three sizes",
  ) satisfies z.ZodType<Record<string, ValidatedClusterJewel>>;

const condition = z.looseObject({
  condition: z.string(),
  operator: z.string().optional(),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])
    .optional(),
  from: z.string().optional(),
});

const renamed = z
  .never({ error: "carries the old `price` key. Publish a taxonomy newer than 3.29.4." })
  .optional();

const variants = z
  .array(z.looseObject({ name: z.string(), conditions: z.array(condition), price: renamed }))
  .optional();

const taxonomy = z.looseObject({
  version: z.string(),
  items: z
    .record(
      z.string(),
      z.looseObject({
        name: z.string(),
        category: z.string(),
        subcategory: z.string().nullable(),
        filterable: z.boolean().optional(),
        conditions: z.array(condition).optional(),
        variants,
        price: renamed,
      }),
    )
    .refine((items) => Object.keys(items).length > 0, "the taxonomy is empty"),
  authored: z.record(
    z.string(),
    z.looseObject({
      name: z.string(),
      category: z.string(),
      subcategory: z.string().nullable(),
      replaces: z.array(z.string()).optional(),
      reason: z.string(),
      conditions: z.array(condition).optional(),
      variants,
      price: renamed,
    }),
  ),
}) satisfies z.ZodType<Taxonomy>;

const taxonomyCategories = z.looseObject({
  version: z.string(),
  categories: z.record(z.string(), z.looseObject({ conditions: z.array(condition) })),
}) satisfies z.ZodType<TaxonomyCategories>;

export const BRONZE_SCHEMAS: readonly {
  readonly file: string;
  readonly schema: z.ZodType;
}[] = [
  { file: BRONZE_FILES.gggItems, schema: gggItems },
  { file: BRONZE_FILES.currencyHour, schema: currencyHour },
  { file: BRONZE_FILES.poeWatchCompact, schema: poeWatchCompact },
  { file: BRONZE_FILES.poeWatchCorruptions, schema: poeWatchCorruptions },
  { file: BRONZE_FILES.poeWatchRatios, schema: poeWatchRatios },
  { file: BRONZE_FILES.repoeBaseItems, schema: repoeBaseItems },
  { file: BRONZE_FILES.repoeGems, schema: gems },
  { file: BRONZE_FILES.repoeEssences, schema: essences },
  { file: BRONZE_FILES.repoeClusterJewels, schema: repoeClusterJewels },
  { file: BRONZE_FILES.taxonomy, schema: taxonomy },
  { file: BRONZE_FILES.taxonomyCategories, schema: taxonomyCategories },
];
