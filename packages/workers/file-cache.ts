import type { CachedResponse, ResponseCache } from "@poe/ggg/types";
import { optionalEnv } from "@util/core/env";
import { fileCache } from "@util/core/file-cache";

/**
 * The cache a worker runs with. `CACHE_DIR` naming a folder is the whole switch — unset
 * means every request goes to GGG, which is what production wants.
 */
export function cacheFromEnv(): ResponseCache | undefined {
  const root = optionalEnv("CACHE_DIR");

  return root === undefined ? undefined : fileCache<CachedResponse>(root);
}
