import type { Mod } from "./types.ts";

/**
 * The whole `mods.json` file: one entry per mod, keyed by its id such as `Strength1`.
 * There is no envelope — the file is the record.
 */
export type Mods = Record<string, Mod>;
