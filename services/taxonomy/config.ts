/**
 * Where a taxonomy lives, as keys rather than paths. The same strings address a file in a
 * folder and an object in a bucket, which is what lets the store behind the service change
 * without anything here changing.
 */

/** Prefix every key sits under. */
export const DEFAULT_PREFIX = "taxonomy";

/** The pointer at the version that is current. Rewritten by a promote, never by a publish. */
export const POINTER_FILE = "latest.json";

export const versionKey = (prefix: string, version: string): string =>
  `${prefix}/${version}.json`;

export const pointerKey = (prefix: string): string => `${prefix}/${POINTER_FILE}`;
