import type { Category } from "../../api/taxonomy/types.ts";
import { titleCase } from "./title-case.ts";

/** A category path as its record names read, `Map Fragments › Boss Fragments`. */
export const categoryLabel = (categories: Readonly<Record<string, Category>>, path: string): string =>
  path
    .split("/")
    .map((part, at, parts) => categories[parts.slice(0, at + 1).join("/")]?.name ?? titleCase(part))
    .join(" › ");
