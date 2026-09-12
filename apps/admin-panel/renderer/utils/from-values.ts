import type { Item } from "../../api/taxonomy/types.ts";
import type { FromValues } from "../types.ts";

export const fromValues = (item: Item): FromValues => ({
  name: item.name,
  baseTypes: item.source === "ggg" ? [item.name] : [item.baseType],
});
