import type { Bucket } from "@poe/filter-style/types";

export function span(bucket: Bucket, unit: string): string {
  if (bucket.ceiling === undefined) return `${bucket.floor}${unit} and up`;
  if (bucket.floor === 0) return `under ${bucket.ceiling}${unit}`;

  return `${bucket.floor}-${bucket.ceiling}${unit}`;
}
