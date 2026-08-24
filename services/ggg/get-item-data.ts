import { cacheKey } from "@util/core/cache-key";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";
import { call } from "./call.ts";
import { tradeApiUrl } from "./config.ts";
import type {
  GGGItem,
  GGGItemData,
  GGGItemDataResponse,
  GGGItemGroup,
  GGGItemGroupData,
} from "./get-item-data.types.ts";
import type { GggContext } from "./types.ts";

const HOUR_MS = 3_600_000;

export const mapGGGItemDataToGGGItem = (data: GGGItemData): GGGItem =>
  data.flags?.unique === true && data.name !== undefined
    ? {
        kind: "unique",
        name: data.name,
        baseType: data.type,
        displayText: data.text ?? data.name,
        ...(data.disc === undefined ? {} : { variantTag: data.disc }),
      }
    : {
        kind: "base",
        baseType: data.type,
        ...(data.text === undefined ? {} : { displayText: data.text }),
        ...(data.disc === undefined ? {} : { variantTag: data.disc }),
      };

export const mapGGGItemGroupDataToGGGItemGroup = (
  data: GGGItemGroupData,
): GGGItemGroup => ({
  id: data.id,
  label: data.label,
  items: data.entries.map(mapGGGItemDataToGGGItem),
});

/**
 * The item list the trade site loads to populate its search: every name it will let you
 * pick, grouped into the broad categories it shows. Base types, uniques with the base
 * each rolls on, and a row per variant for transfigured gems and blighted maps.
 */
export async function getItemData({
  limiter,
  onEvent,
}: GggContext): Promise<readonly GGGItemGroup[]> {
  const root = optionalEnv("CACHE_DIR");
  const cache =
    root === undefined ? undefined : fileCache<readonly GGGItemGroup[]>(root);
  const key = cacheKey(
    "data-items-kind",
    String(Math.floor(Date.now() / HOUR_MS)),
  );

  const cached = await cache?.get(key);
  if (cached !== undefined) return cached;

  const response = await call<GGGItemDataResponse>(
    `${tradeApiUrl()}/data/items`,
    { limiter, onEvent },
  );

  const groups = response.result.map(mapGGGItemGroupDataToGGGItemGroup);

  await cache?.set(key, groups);

  return groups;
}
