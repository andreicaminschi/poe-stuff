/**
 * The whole `ModFoulbornMap.json` file: every unique that can drop foulborn, keyed by its
 * display name, to the text of the foulborn mods it can roll — one to four lines each, with
 * the ranges left in: `+(50-75)% to Damage over Time Multiplier for Bleeding`.
 *
 * Path of Building's table, and the only published list of which uniques go foulborn. The
 * game's own files do not say. No envelope; the file is the record.
 */
export type FoulbornMap = Record<string, string[]>;
