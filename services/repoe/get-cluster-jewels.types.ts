import type { ClusterJewel } from "./types.ts";

/**
 * The whole `cluster_jewels.json` file: one entry per size, keyed by the jewel's metadata
 * id — `Metadata/Items/Jewels/JewelPassiveTreeExpansionLarge`. Three rows, no envelope.
 */
export type ClusterJewels = Record<string, ClusterJewel>;
