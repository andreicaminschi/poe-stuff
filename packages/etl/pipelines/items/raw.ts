import { z } from "zod";

/**
 * Contract for `POE_ITEMS_URL`. Mirrors GGG's wire shape exactly — do not make
 * it nicer here, that is `transform.ts`'s job.
 */
const RawItemEntrySchema = z.object({
  /** Base type, e.g. `Ruby Ring`. Present on every entry; not unique. */
  type: z.string(),
  /** Full display text; absent for plain bases, where it equals `type`. */
  text: z.string().optional(),
  /** Unique name, e.g. `Auxium`. Present iff `flags.unique` is set. */
  name: z.string().optional(),
  /** Disambiguator when one name has several forms: `legacy`, `blighted`, ... */
  disc: z.string().optional(),
  flags: z.object({ unique: z.boolean().optional() }).optional(),
});

const RawItemGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  entries: z.array(RawItemEntrySchema),
});

export const RawItemsSchema = z.object({
  result: z.array(RawItemGroupSchema),
});

export type RawItemEntry = z.infer<typeof RawItemEntrySchema>;
export type RawItemGroup = z.infer<typeof RawItemGroupSchema>;
export type RawItems = z.infer<typeof RawItemsSchema>;

export function parseRawItems(input: unknown): RawItems {
  const result = RawItemsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Items response did not match the contract:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
