import { z } from "zod";

/**
 * Contract for `POE_STATIC_URL`. Mirrors GGG's wire shape exactly — do not make
 * it nicer here, that is `transform.ts`'s job.
 */
const RawStaticEntrySchema = z.object({
  /** Not unique: the `sep` separator row appears 23 times across 8 groups. */
  id: z.string(),
  text: z.string(),
  /** Site-relative path under `/gen/image/...`, not an absolute URL. */
  image: z.string().optional(),
  /** Set to true on synthetic entries like `sacrifice-set` that aren't real items. */
  pseudo: z.boolean().optional(),
  subtext: z.string().optional(),
  description: z.string().optional(),
});

const RawStaticGroupSchema = z.object({
  id: z.string(),
  /** Null on the empty `Misc` group. */
  label: z.string().nullable(),
  entries: z.array(RawStaticEntrySchema),
});

export const RawStaticSchema = z.object({
  result: z.array(RawStaticGroupSchema),
});

export type RawStaticEntry = z.infer<typeof RawStaticEntrySchema>;
export type RawStaticGroup = z.infer<typeof RawStaticGroupSchema>;
export type RawStatic = z.infer<typeof RawStaticSchema>;

export function parseRawStatic(input: unknown): RawStatic {
  const result = RawStaticSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Static response did not match the contract:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
