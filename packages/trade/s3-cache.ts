import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import type { CachedResponse, ResponseCache } from "@poe/ggg/types";
import { optionalEnv } from "@util/core/env";
import { s3 } from "./s3-client.ts";

/**
 * `cacheKey` hands back `namespace:digest`. Turning the colon into a slash makes the
 * namespace a folder, so a bucket listing groups by what wrote the entry.
 */
const objectKey = (key: string) => `cache/${key.replace(":", "/")}.json`;

/** A missing object is a miss, not a failure. Everything else is a real error. */
function isMissing(error: unknown): boolean {
  const { name, $metadata } = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };

  return name === "NoSuchKey" || $metadata?.httpStatusCode === 404;
}

/**
 * Responses kept as objects, one per request. A write that fails throws rather than
 * being swallowed: this runs where someone is watching, and a cache that quietly stores
 * nothing looks exactly like one that is working.
 */
export function s3Cache(
  bucket: string,
  client: S3Client = s3(),
): ResponseCache {
  return {
    async get(key) {
      try {
        const answer = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
        );
        const body = await answer.Body?.transformToString();

        return body === undefined
          ? undefined
          : (JSON.parse(body) as CachedResponse);
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    },

    async set(key, value) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey(key),
          Body: JSON.stringify(value),
          ContentType: "application/json",
        }),
      );
    },
  };
}

/**
 * The cache a worker runs with. `CACHE_BUCKET` naming a bucket is the whole switch —
 * unset means every request goes to GGG, which is what production wants.
 */
export function cacheFromEnv(): ResponseCache | undefined {
  const bucket = optionalEnv("CACHE_BUCKET");

  return bucket === undefined ? undefined : s3Cache(bucket);
}
