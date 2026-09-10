import type { Gem } from "./types.ts";

/**
 * The whole `Gems.json` file: one entry per gem **variant**, keyed by the variant's
 * metadata id. There is no envelope — the file is the record.
 *
 * The key is the variant, not the gem. Group by `gameId` to get one entry per gem.
 */
export type Gems = Record<string, Gem>;
