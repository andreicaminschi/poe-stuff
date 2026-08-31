import { S3Client } from "@aws-sdk/client-s3";
import { optionalEnv } from "@util/env";

/**
 * One client for the process. `S3_URL` points at MinIO on a laptop and is absent on AWS;
 * path style goes with it, because a bucket cannot be a subdomain of `localhost`.
 * Credentials and region are left to the SDK's own environment.
 */
let shared: S3Client | undefined;

export function s3(): S3Client {
  if (shared === undefined) {
    const endpoint = optionalEnv("S3_URL");
    shared = new S3Client(
      endpoint === undefined ? {} : { endpoint, forcePathStyle: true },
    );
  }

  return shared;
}
