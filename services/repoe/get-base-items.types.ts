import type { BaseItem } from "./types.ts";

/**
 * The whole `base_items.json` file: one entry per base, keyed by metadata id such as
 * `Metadata/Items/Currency/CurrencyRerollRare`. There is no envelope — the file is the
 * record.
 */
export type BaseItems = Record<string, BaseItem>;
