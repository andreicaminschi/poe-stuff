import { z } from "zod";

/**
 * Contract for `POE_STATS_URL`. Mirrors GGG's wire shape exactly — do not make
 * it nicer here, that is `transform.ts`'s job. Unknown keys are stripped, so
 * additive API changes pass through silently while renames fail loudly.
 */
const RawStatOptionSchema = z.object({
  id: z.number().int(),
  text: z.string(),
});

const RawStatEntrySchema = z.object({
  id: z.string(),
  /** Display text; `#` marks a numeric placeholder, `\n` separates lines. */
  text: z.string(),
  /** Always equals the enclosing group's id. */
  type: z.string(),
  option: z.object({ options: z.array(RawStatOptionSchema) }).optional(),
});

const RawStatGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  entries: z.array(RawStatEntrySchema),
});

export const RawStatsSchema = z.object({
  result: z.array(RawStatGroupSchema),
});

export type RawStatOption = z.infer<typeof RawStatOptionSchema>;
export type RawStatEntry = z.infer<typeof RawStatEntrySchema>;
export type RawStatGroup = z.infer<typeof RawStatGroupSchema>;
export type RawStats = z.infer<typeof RawStatsSchema>;

export function parseRawStats(input: unknown): RawStats {
  const result = RawStatsSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Stats response did not match the contract:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
