import type { GggItem } from "../../api/taxonomy/types.ts";
import type { Flag } from "../types.ts";

export function withFlag(item: GggItem, field: Flag, value: boolean | undefined): GggItem {
  const { [field]: _drop, ...rest } = item;

  return value === undefined ? rest : { ...rest, [field]: value };
}
