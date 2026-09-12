import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { ItemData } from "@poe/poe-watch/get-compact-data.types";
import type { CorruptionOutcome, ExchangeRatioPrice } from "@poe/poe-watch/types";
import type { ItemCorruptions } from "@poe/poe-watch/get-corruption-data.types";
import type { ExchangeRatioItem } from "@poe/poe-watch/get-exchange-ratios.types";
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
        displayName: z.string().optional(),
        category: z.string(),
        subcategory: z.string().nullable(),
        filterable: z.boolean().optional(),
        excluded: z.boolean().optional(),
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
      baseType: z.string(),
      category: z.string(),
      subcategory: z.string().nullable(),
      replaces: z.array(z.string()).optional(),
      reason: z.string(),
      excluded: z.boolean().optional(),
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
  { file: BRONZE_FILES.poeWatchCompact, schema: poeWatchCompact },
  { file: BRONZE_FILES.poeWatchCorruptions, schema: poeWatchCorruptions },
  { file: BRONZE_FILES.poeWatchRatios, schema: poeWatchRatios },
  { file: BRONZE_FILES.taxonomy, schema: taxonomy },
  { file: BRONZE_FILES.taxonomyCategories, schema: taxonomyCategories },
];
