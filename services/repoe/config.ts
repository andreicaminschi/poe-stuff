/**
 * Where RePoE lives by default, and who we say we are when nobody says otherwise.
 *
 * Constants rather than env reads: a service is configured by whoever builds it. Nothing
 * in this package touches `process.env`, which is what lets it run with no `.env` at all.
 */

/** Base of the RePoE fork's GitHub Pages site, without a trailing slash. */
export const DEFAULT_BASE_URL = "https://repoe-fork.github.io";

/**
 * `user-agent` sent when the caller names none. This is a static site on GitHub Pages, so
 * nobody requires a particular one — unlike GGG, which is why that service refuses to
 * default and this one does.
 */
export const DEFAULT_USER_AGENT = "poe-stuff/1.0";

/** Trailing slash stripped, so joins onto a base stay predictable. */
export const trimUrl = (url: string): string => url.replace(/\/$/, "");
