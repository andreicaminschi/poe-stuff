import { createGGGService } from "@poe/ggg/service";
import { createRepoeService } from "@poe/repoe/service";
import type { CachedResponse } from "@poe/repoe/types";
import { fileCache } from "@util/cache/file-cache";
import { collectItems } from "./build-item-list/collect-items.ts";
import { fillFromRepoe } from "./build-item-list/fill-from-repoe.ts";
import type { ItemsFile } from "./types.ts";

export type BuildOptions = {
  readonly userAgent: string;
  readonly league: string;
  readonly hourId: number;
  /** Where the RePoE export is kept between runs — `cache/repoe`, one file per hour. */
  readonly cacheDir: string;
  readonly log: (line: string) => void;
};

/**
 * Every item the game can show, named and flagged.
 *
 * One GGG service for the whole run. One service is one IP, and one IP is one budget.
 *
 * RePoE gets a cache on disk. Its whole export arrives in one download with no way to ask
 * for less, and the service keys an entry by the hour, so a second run inside the hour
 * reads the file instead of the network. RePoE only moves when GGG ships a patch.
 *
 * **The league's Item Filter Information forum post used to be a fourth source**, and it
 * was the only one that could name an item before RePoE caught up with a launch. It was
 * removed with the forum endpoints on `@poe/ggg`, so nothing here detects a new league any
 * more and nothing applies this league's renames. `apps/poe-items` has to answer where
 * that comes from — see its README.
 */
export async function buildItemList(options: BuildOptions): Promise<ItemsFile> {
  const ggg = createGGGService({ userAgent: options.userAgent });

  const repoe = createRepoeService({
    userAgent: options.userAgent,
    cache: fileCache<CachedResponse>(options.cacheDir),
  });

  const baseItems = await repoe.getBaseItems();

  const collected = await collectItems({
    ggg,
    hourId: options.hourId,
    league: options.league,
    baseItems,
  });

  options.log(`item list: ${collected.items.size} items`);
  options.log(`traded but absent from RePoE: ${collected.absentInRepoe}`);

  // RePoE last: the game's own export outranks whatever the trade site said.
  const items = fillFromRepoe(collected.items, baseItems);

  return {
    generatedAt: new Date().toISOString(),
    league: options.league,
    hourId: options.hourId,
    repoeIncomplete: collected.absentInRepoe > 0,
    items: Object.fromEntries(
      [...items.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((item) => [item.key, item]),
    ),
  };
}
