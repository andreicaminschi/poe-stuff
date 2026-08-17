import { z } from "zod";

/**
 * Contract for `POE_LEAGUES_URL`. The only endpoint that returns a flat list
 * rather than groups. Mirrors GGG's wire shape exactly.
 */
const RawLeagueSchema = z.object({
  /** Not unique on its own — the same league id exists on every realm. */
  id: z.string(),
  /** `pc`, `xbox` or `sony`. Left as a string; GGG may add more. */
  realm: z.string(),
  text: z.string(),
});

export const RawLeaguesSchema = z.object({
  result: z.array(RawLeagueSchema),
});

export type RawLeague = z.infer<typeof RawLeagueSchema>;
export type RawLeagues = z.infer<typeof RawLeaguesSchema>;

export function parseRawLeagues(input: unknown): RawLeagues {
  const result = RawLeaguesSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      `Leagues response did not match the contract:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
