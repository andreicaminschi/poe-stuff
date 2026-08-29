import type { BaseItems } from "@poe/repoe/get-base-items.types";
import type { ProcessedPost } from "../types.ts";

export type Detection = {
  readonly newLeague: boolean;
  /** Names the post lists that RePoE has never heard of. */
  readonly missingNames: readonly string[];
};

/**
 * Has a league launched that RePoE has not caught up with?
 *
 * Asked this way round on purpose. Judging it by currency the exchange trades and RePoE
 * cannot name would miss a league that adds no new currency, and a filter maintainer wants
 * every new item highlighted, not only the ones that happen to trade.
 */
export function detectNewLeague(
  post: ProcessedPost | null,
  baseItems: BaseItems,
): Detection {
  if (post === null) return { newLeague: false, missingNames: [] };

  const known = new Set(Object.values(baseItems).map((base) => base.name));

  const missingNames = post.newItems
    .flatMap((group) => group.names)
    .filter((name) => !known.has(name));

  return { newLeague: missingNames.length > 0, missingNames };
}
