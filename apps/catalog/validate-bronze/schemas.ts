import type { GGGItemGroup } from "@poe/ggg/get-item-data.types";
import type { CurrencyExchange } from "@poe/ggg/types";
import type { BaseItem } from "@poe/repoe/get-base-items.types";
import type { Taxonomy } from "@poe/taxonomy/get-taxonomy.types";
import { z } from "zod";
import { BRONZE_FILES } from "../lake/keys.ts";

/**
 * Every object here is loose, so a field GGG or RePoE adds next patch passes straight
 * through. Bronze is the raw record: a schema that rejected an unknown field would turn
 * every upstream addition into an outage, and the field is one nothing here reads anyway.
 *
 * What each schema does assert is the fields silver actually uses, plus whatever the
 * service type marks required. That is what the `satisfies` on each one pins: rename a
 * field in a service and this file stops compiling, rather than a run failing at midnight.
 */

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

/**
 * The trade site's item list.
 *
 * **Never legitimately empty.** No groups means the endpoint answered with something that
 * is not the item list, and every silver row that is not currency would silently vanish.
 */
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

/** One side of a market, keyed by the metadata id it belongs to. */
const side = z.record(z.string(), z.number());

/**
 * One hour of the exchange.
 *
 * **`markets` may be empty and that is not a failure.** A league can trade nothing in an
 * hour, and a dead league would otherwise block every run collected against it.
 */
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

/**
 * What silver reads off a base item: the name it is keyed by, the class and release state
 * that filter it, the tags, and the art folder that gives a currency its subcategory.
 *
 * The other twenty-odd fields RePoE exports are not asserted. They are not read, and a
 * schema that covered them would fail on an export that changed something nothing uses.
 */
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

/**
 * The taxonomy as it was published.
 *
 * **Never legitimately empty.** A table with no items classifies nothing, and every silver
 * row would come out with no category rather than the run failing where the fault is.
 */
const taxonomy = z.looseObject({
  version: z.string(),
  items: z
    .record(
      z.string(),
      z.looseObject({
        category: z.string(),
        subcategory: z.string().nullable(),
      }),
    )
    .refine((items) => Object.keys(items).length > 0, "the taxonomy is empty"),
}) satisfies z.ZodType<Taxonomy>;

/**
 * Which schema reads which file. The validator walks this list, so covering a new bronze
 * source is one entry here.
 */
export const BRONZE_SCHEMAS: readonly {
  readonly file: string;
  readonly schema: z.ZodType;
}[] = [
  { file: BRONZE_FILES.gggItems, schema: gggItems },
  { file: BRONZE_FILES.currencyHour, schema: currencyHour },
  { file: BRONZE_FILES.repoeBaseItems, schema: repoeBaseItems },
  { file: BRONZE_FILES.taxonomy, schema: taxonomy },
];
