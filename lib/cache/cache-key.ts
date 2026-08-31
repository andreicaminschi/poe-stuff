import { createHash } from "node:crypto";

/**
 * A stable key for a tuple of strings, safe to use as an S3 object name or a Redis key.
 *
 * Each part is length-prefixed before hashing, so two different tuples can never encode
 * to the same input — `["a:b", "c"]` becomes `3:a:b1:c` and `["a", "b:c"]` becomes
 * `1:a3:b:c`. A plain join cannot promise that at any delimiter, because whatever
 * character you separate on is legal inside a part.
 *
 * Idempotent by construction: no clock, no randomness, no iteration order. The same
 * parts produce the same key across calls, processes and machines.
 *
 * The namespace stays outside the digest, so it reads in logs and keys under different
 * namespaces cannot collide at all. It is joined with an underscore rather than a colon
 * because a colon is a separator everywhere these keys end up — BullMQ builds its own
 * Redis keys with it and rejects it in a job id, and Windows will not have it in a
 * filename. An underscore needs undoing nowhere.
 */
export function cacheKey(namespace: string, ...parts: string[]): string {
  const encoded = parts.map((part) => `${part.length}:${part}`).join("");
  const digest = createHash("sha256").update(encoded).digest("hex");

  return `${namespace}_${digest}`;
}
