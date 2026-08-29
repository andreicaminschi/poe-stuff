import { createGGGService } from "@poe/ggg/service";
import { createRepoeService } from "@poe/repoe/service";
import type { CachedResponse } from "@poe/repoe/types";
import { fileCache } from "@util/core/file-cache";
import { collectItems } from "./build-item-list/collect-items.ts";
import { detectNewLeague } from "./build-item-list/detect-new-league.ts";
import { fillFromRepoe } from "./build-item-list/fill-from-repoe.ts";
import { syncForumPosts } from "./build-item-list/sync-forum-posts.ts";
import { applyFilterPost } from "./build-item-list/apply-filter-post.ts";
import type { ItemsFile } from "./types.ts";

export type BuildOptions = {
  readonly userAgent: string;
  readonly league: string;
  readonly hourId: number;
  readonly postDir: string;
  /** Where the RePoE export is kept between runs — `cache/repoe`, one file per hour. */
  readonly cacheDir: string;
  readonly model: string;
  readonly forceSearch: boolean;
  readonly useForum: boolean;
  readonly log: (line: string) => void;
};

/**
 * Every item the game can show, named and flagged.
 *
 * New-league detection runs first and decides how everything after it reads: a RePoE that
 * cannot name half the exchange is alarming on an ordinary Tuesday and expected on launch
 * day, and the script should know which one it is before it builds anything.
 *
 * One GGG service for the whole run, forum included. One service is one IP, and GGG counts
 * the forum against the same budget as trade.
 *
 * RePoE gets a cache on disk. Its whole export arrives in one download with no way to ask
 * for less, and the service keys an entry by the hour, so a second run inside the hour
 * reads the file instead of the network. RePoE only moves when GGG ships a patch.
 */
export async function buildItemList(options: BuildOptions): Promise<ItemsFile> {
  const ggg = createGGGService({ userAgent: options.userAgent });

  const repoe = createRepoeService({
    userAgent: options.userAgent,
    cache: fileCache<CachedResponse>(options.cacheDir),
  });

  const [baseItems, post] = await Promise.all([
    repoe.getBaseItems(),
    options.useForum
      ? syncForumPosts({
          ggg,
          dir: options.postDir,
          model: options.model,
          force: options.forceSearch,
          log: options.log,
        })
      : Promise.resolve(null),
  ]);

  const { newLeague, missingNames } = detectNewLeague(post, baseItems);

  options.log(`newest post: ${post?.post.title ?? "none"}`);
  options.log(
    newLeague
      ? `NEW LEAGUE: ${missingNames.length} of its items are not in RePoE yet`
      : "no new league: RePoE has everything the newest post names",
  );

  const collected = await collectItems({
    ggg,
    hourId: options.hourId,
    league: options.league,
    baseItems,
  });

  options.log(`item list: ${collected.items.size} items`);
  options.log(`traded but absent from RePoE: ${collected.absentInRepoe}`);

  const fromPost =
    post === null
      ? collected.items
      : applyFilterPost(collected.items, post, missingNames);

  // RePoE last: the game's own export outranks whatever the post or the trade site said.
  const items = fillFromRepoe(fromPost, baseItems);

  return {
    generatedAt: new Date().toISOString(),
    league: options.league,
    hourId: options.hourId,
    newLeague,
    repoeIncomplete: collected.absentInRepoe > 0,
    forumPost: post?.post ?? null,
    namesMissingFromRepoe: missingNames,
    items: Object.fromEntries(
      [...items.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((item) => [item.key, item]),
    ),
  };
}
