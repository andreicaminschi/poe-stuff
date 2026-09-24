import type { CategoryRecord, PlaceOptions } from "@poe/filter-style/types";
import { STACK_FLOORS, type GeneratorConfig } from "../../api/generator-api.ts";
import { categoryConfig } from "./category-config.ts";

/** One category's settings, as `place` takes them. */
export function placeOptions(config: GeneratorConfig, key: string, record: CategoryRecord | undefined): PlaceOptions {
  const category = categoryConfig(config, key);
  const stack = record?.tiering === "stack-size";

  return {
    floors: category.floors ?? (stack ? STACK_FLOORS : config.floors),
    disabled: category.disabled,
    hints: record?.hints ?? [],
    wanted: category.wanted,
    ...(stack ? { tiering: "stack-size" as const } : {}),
  };
}
