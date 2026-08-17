import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { optionalEnv, requireEnv } from "./env.ts";

let client: S3Client | undefined;

export function s3(): S3Client {
  client ??= new S3Client({
    endpoint: optionalEnv("S3_ENDPOINT"),
    region: optionalEnv("S3_REGION") ?? "us-east-1",
    forcePathStyle: optionalEnv("S3_FORCE_PATH_STYLE") === "true",
  });
  return client;
}

export const bucket = () => requireEnv("S3_BUCKET");

export async function ensureBucket(): Promise<void> {
  const Bucket = bucket();
  try {
    await s3().send(new HeadBucketCommand({ Bucket }));
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket }));
  }
}

export async function getJson<T>(key: string): Promise<T | undefined> {
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const body = await out.Body?.transformToString();
    return body === undefined ? undefined : (JSON.parse(body) as T);
  } catch {
    return undefined;
  }
}

export async function putJson(key: string, value: unknown): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: JSON.stringify(value),
      ContentType: "application/json",
    }),
  );
}
