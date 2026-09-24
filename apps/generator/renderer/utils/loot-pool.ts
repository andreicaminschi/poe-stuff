import { tierStyle } from "@poe/filter-style/tier-style";
import type { BucketName, Style } from "@poe/filter-style/types";
import type { CategoryPlan } from "@poe/filter-style/write-filter";

export type Loot = { readonly name: string; readonly bucket: BucketName; readonly style: Style; readonly worth: number };

/** Every winning block of every category, as something that can drop. */
export const lootPool = (plans: readonly CategoryPlan[]): readonly Loot[] =>
  plans.flatMap(({ palette, placed }) =>
    placed.placed
      .filter((one) => one.won)
      .map((one) => ({
        name: one.item.name,
        bucket: one.bucket,
        style: tierStyle(palette, one.bucket, one.verb),
        worth: one.stack?.floor ?? one.item.prices[one.verb] ?? 0,
      })),
  );
