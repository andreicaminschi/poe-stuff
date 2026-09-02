import { call, currentHour } from "./call.ts";
import type { ClusterJewels } from "./get-cluster-jewels.types.ts";
import type { RepoeContext } from "./types.ts";

/**
 * The three cluster jewel sizes and every passive each can be enchanted with, from
 * `GET /cluster_jewels.json`.
 *
 * **The whole file in one request, with no way to ask for less**, like every other export
 * here. It sits at the site root beside `base_items.json` rather than under `pob-data`, and
 * has no `.min` variant.
 *
 * What comes back is the file itself — an object keyed by the jewel's metadata id, no
 * envelope around it. Three rows, and the passives under them are the point: each one pairs
 * the enchant's mod text with the passive's name.
 */
export async function getClusterJewels(
  context: RepoeContext,
): Promise<ClusterJewels> {
  return call<ClusterJewels>(
    `${context.baseUrl}/cluster_jewels.json`,
    currentHour(),
    context,
  );
}
