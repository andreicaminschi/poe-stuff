import type { FilterBlock } from "@poe/filter-eval/filter-ast";

/** The row key a block's freehand names: `<key>` or `<key> <variant>`. */
export function ownerOf(block: FilterBlock): string | undefined {
  const key = block.freehand.trim().split(" ")[0] ?? "";
  return key === "" ? undefined : key;
}
