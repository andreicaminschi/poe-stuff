import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireEnv } from "@util/core/env";
import { LATEST_KEY, currencyObjectKey, pageObjectKey } from "./keys.ts";
import { s3 } from "./s3-client.ts";

/** S3 takes a thousand keys per delete call. */
const DELETE_CHUNK = 1000;

/**
 * One item per line. Trino reads line-delimited JSON, and the items themselves are
 * written exactly as they arrived — this is a raw drop, and anything that consolidates
 * or reshapes them is a later pass over these objects.
 */
const ndjson = (items: readonly unknown[]) =>
  items.map((item) => JSON.stringify(item)).join("\n") + "\n";

/**
 * Writes one page and answers with the key it wrote, which the ledger records. The key
 * comes from the cohort, the query and the page number, so a page written twice
 * overwrites itself rather than leaving a second copy for an ETL to count.
 */
export async function writePage(
  cohortId: string,
  queryId: string,
  page: number,
  items: readonly unknown[],
): Promise<string> {
  const key = pageObjectKey(cohortId, queryId, page);

  await s3().send(
    new PutObjectCommand({
      Bucket: requireEnv("S3_BUCKET"),
      Key: key,
      Body: ndjson(items),
      ContentType: "application/x-ndjson",
    }),
  );

  return key;
}

/** Moves the pointer a reader with no database follows. Only a promoted cohort gets here. */
export async function writeLatest(cohortId: string): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: requireEnv("S3_BUCKET"),
      Key: LATEST_KEY,
      Body: JSON.stringify({ cohortId }),
      ContentType: "application/json",
    }),
  );
}

/**
 * Removes the objects a deprecated query left behind. Without this its pages stay under
 * the cohort's prefix and an ETL reads data the cohort no longer counts.
 */
export async function deletePages(keys: readonly string[]): Promise<number> {
  const bucket = requireEnv("S3_BUCKET");

  for (let from = 0; from < keys.length; from += DELETE_CHUNK) {
    const batch = keys.slice(from, from + DELETE_CHUNK);

    await s3().send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }

  return keys.length;
}

/**
 * One hour of Currency Exchange markets, filtered to one league and written as they
 * arrived. Same raw drop as a page: the VWAP, the spread and anything chaos-normalised
 * are a later pass over these objects, not something this worker computes.
 */
export async function writeCurrencyHour(
  league: string,
  hourId: number,
  markets: readonly unknown[],
): Promise<string> {
  const key = currencyObjectKey(league, hourId);

  await s3().send(
    new PutObjectCommand({
      Bucket: requireEnv("S3_BUCKET"),
      Key: key,
      Body: ndjson(markets),
      ContentType: "application/x-ndjson",
    }),
  );

  return key;
}
