import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { optionalEnv, requireEnv } from "./env.ts";

/**
 * Lazy so importing this module never fails on a missing `S3_REGION` — only the
 * pipelines that actually write pay for the config.
 *
 * Credentials come from the SDK's default provider chain, which reads
 * `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` straight out of `--env-file`.
 * `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE` are what point it at local MinIO;
 * unset them and the same code talks to real S3.
 */
let cached: S3Client | undefined;

function client(): S3Client {
  cached ??= new S3Client({
    region: requireEnv("S3_REGION"),
    endpoint: optionalEnv("S3_ENDPOINT"),
    forcePathStyle: optionalEnv("S3_FORCE_PATH_STYLE") === "true",
  });
  return cached;
}

const ensured = new Set<string>();

/**
 * MinIO starts empty and a fresh AWS account has no bucket either, so a run
 * would fail on its first `PutObject`. Checked once per bucket per process.
 */
export async function ensureBucket(bucket: string): Promise<void> {
  if (ensured.has(bucket)) return;

  try {
    await client().send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (!isMissing(error)) throw error;
    await client().send(new CreateBucketCommand({ Bucket: bucket }));
  }

  ensured.add(bucket);
}

/** Returns the `s3://` URI, so callers can log where the object landed. */
export async function putObject(
  bucket: string,
  key: string,
  body: string,
  contentType: string,
): Promise<string> {
  await client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
  return `s3://${bucket}/${key}`;
}

/** `HeadBucket` answers 404 with an empty body, so the name is all we get. */
function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "NotFound" || error.name === "NoSuchBucket")
  );
}
