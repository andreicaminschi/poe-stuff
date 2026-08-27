import { call } from "./call.ts";
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
 *
 * The hour goes into the cache key, so a stored answer is only ever read back inside the
 * hour that wrote it. Old files are never deleted, they only stop being asked for.
 */
export async function getItemData({
  limiter,
  tradeApiUrl,
  userAgent,
  cache,
  onEvent,
}: GggContext): Promise<readonly GGGItemGroup[]> {
  const response = await call<GGGItemDataResponse>(`${tradeApiUrl}/data/items`, {
    userAgent,
    limiter,
    cache,
    onEvent,
    cacheSalt: String(Math.floor(Date.now() / HOUR_MS)),
  });

  return response.result.map(mapGGGItemGroupDataToGGGItemGroup);
}
