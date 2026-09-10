import type { Essence } from "./types.ts";

/**
 * The whole `Essence.json` file: one entry per essence, keyed by its currency metadata id
 * such as `Metadata/Items/Currency/CurrencyEssenceAnger1`. There is no envelope — the file
 * is the record.
 */
export type Essences = Record<string, Essence>;
