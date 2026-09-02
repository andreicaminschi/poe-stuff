/**
 * One passive a cluster jewel can be enchanted with: the enchant the item carries, and the
 * name that passive has on the tree.
 *
 * `stat_text` is the mod text, one line per stat, exactly as the client shows it — and
 * exactly as PoeWatch writes it into a listing's name. `name` is what a `.filter` asks for
 * with `EnchantmentPassiveNode`. Pairing the two is the whole reason the file is read.
 */
export type ClusterJewelPassive = {
  /** `affliction_axe_and_sword_damage`. Unique within a size. */
  id: string;
  /** `Axe and Sword Damage`. What `EnchantmentPassiveNode` matches. */
  name: string;
  /** Stat id to value. */
  stats: Record<string, number>;
  /**
   * One line per stat, as the client shows it. A two-line enchant is two entries, and the
   * order is not PoeWatch's: it writes `Staff` before `Mace or Sceptre`, this file the other
   * way round. Compare as a set.
   */
  stat_text: string[];
  /** The same as `id` on every row seen. */
  tag: string;
};

/** One size of cluster jewel, as RePoE exports it. */
export type ClusterJewel = {
  /** `Large Cluster Jewel`. */
  name: string;
  /** `Large`, `Medium` or `Small`. */
  size: string;
  /** How many passives the jewel adds, as its "Adds # Passive Skills" mod may roll. */
  min_skills: number;
  max_skills: number;
  /** Positions on the jewel's own subgraph, by role. */
  notable_indices: number[];
  small_indices: number[];
  socket_indices: number[];
  total_indices: number;
  /** Every enchant this size can roll. */
  passive_skills: ClusterJewelPassive[];
};

/**
 * The whole `cluster_jewels.json` file: one entry per size, keyed by the jewel's metadata
 * id — `Metadata/Items/Jewels/JewelPassiveTreeExpansionLarge`. Three rows, no envelope.
 */
export type ClusterJewels = Record<string, ClusterJewel>;
