import { createHash } from "node:crypto";

/** Builds a stable, filename-safe key for a tuple of strings, to name a cached response. */
export function buildCacheKey(namespace: string, ...parts: string[]): string {
  const encoded = parts.map((part) => `${part.length}:${part}`).join(""); // length prefix: no collisions
  const digest = createHash("sha256").update(encoded).digest("hex");

  return `${namespace}_${digest}`;
}
