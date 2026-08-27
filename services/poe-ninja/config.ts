/**
 * Where poe.ninja lives by default, and who we say we are when nobody says otherwise.
 *
 * Constants rather than env reads: a service is configured by whoever builds it. Nothing
 * in this package touches `process.env`, which is what lets it run with no `.env` at all.
 */

/** Base of the poe.ninja API, without a trailing slash. */
export const DEFAULT_BASE_URL = "https://poe.ninja";

/**
 * `user-agent` sent when the caller names none. poe.ninja publishes no requirement about
 * it — unlike GGG, which is why that service refuses to default and this one does.
 */
export const DEFAULT_USER_AGENT = "poe-stuff/1.0";

/**
 * The realm and game every path in this package sits under.
 *
 * poe.ninja serves PoE2 from `/poe2/` behind the same shapes. Nothing here is generic
 * over that yet, and pretending otherwise would be a parameter no caller could pass a
 * second value to.
 */
export const GAME_PATH = "poe1";

/** Trailing slash stripped, so joins onto a base stay predictable. */
export const trimUrl = (url: string): string => url.replace(/\/$/, "");
