import type { Classification } from "../../api/taxonomy/types.ts";
import type { Origins } from "../types.ts";

/** The names behind the levels a condition on this item or variant can come from. */
export const conditionOrigins = (classification: Classification, item?: string, variant?: string): Origins => ({
  category: classification.category,
  ...(classification.subcategory === null
    ? {}
    : { subcategory: `${classification.category}/${classification.subcategory}` }),
  ...(item === undefined ? {} : { item }),
  ...(variant === undefined ? {} : { variant }),
});
