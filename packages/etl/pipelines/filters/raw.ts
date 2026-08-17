import { z } from "zod";

/**
 * Contract for `POE_FILTERS_URL` — the trade site's search form, describing
 * every filter panel and its inputs. Mirrors GGG's wire shape exactly; the UI
 * hint flags below are theirs, not ours.
 */
const RawFilterOptionSchema = z.object({
  /** Null on the sentinel choice ("Any", "No", "Any Time"), which means unset. */
  id: z.string().nullable(),
  text: z.string(),
});

const RawFilterSchema = z.object({
  id: z.string(),
  /** Absent on `status`, the one filter the site renders without a label. */
  text: z.string().optional(),
  tip: z.string().optional(),
  /** Rendered as a min/max numeric pair rather than a single input. */
  minMax: z.boolean().optional(),
  fullSpan: z.boolean().optional(),
  halfSpan: z.boolean().optional(),
  /** Rendered as the socket/link colour widget. */
  sockets: z.boolean().optional(),
  input: z.object({ placeholder: z.string() }).optional(),
  /** Either an enumerated list, or a lookup against known item names. */
  option: z
    .object({
      options: z.array(RawFilterOptionSchema).optional(),
      knownItem: z
        .object({
          uniques: z.boolean().optional(),
          cards: z.boolean().optional(),
          currency: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
});

const RawFilterGroupSchema = z.object({
  id: z.string(),
  /** Absent on `status_filters`, which renders outside the panels. */
  title: z.string().optional(),
  /** Set when the panel starts collapsed. */
  hidden: z.boolean().optional(),
  filters: z.array(RawFilterSchema),
});

export const RawFiltersSchema = z.object({
  result: z.array(RawFilterGroupSchema),
});

export type RawFilter = z.infer<typeof RawFilterSchema>;
export type RawFilterGroup = z.infer<typeof RawFilterGroupSchema>;
export type RawFilters = z.infer<typeof RawFiltersSchema>;

export function parseRawFilters(input: unknown): RawFilters {
  const result = RawFiltersSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Filters response did not match the contract:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
