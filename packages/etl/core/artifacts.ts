import { optionalEnv } from "./env.ts";
import { putObject } from "./s3.ts";

/**
 * The three artifacts a pipeline writes, bound to one bucket and one pipeline
 * name so `load` never repeats either.
 */
export type Artifacts = {
  /** Grouped and pretty, the artifact you actually read. */
  readonly json: (value: unknown) => Promise<string>;
  /** One flat row per line — the shape Athena and jq want. */
  readonly ndjson: (rows: readonly unknown[]) => Promise<string>;
  /** Kept apart so the two artifacts above stay byte-deterministic. */
  readonly meta: (source: string, totals: unknown) => Promise<string>;
};

/**
 * Keys are grouped by *role*, because an Athena table's `LOCATION` is a prefix
 * and it reads every object beneath it, recursively:
 *
 *     tables/stats/stats.ndjson   <- LOCATION 's3://<bucket>/tables/stats/'
 *     json/stats.json
 *     meta/stats.meta.json
 *
 * Only `tables/<name>/` is ever a table location, and nothing but that table's
 * rows can appear under it — the pretty JSON would parse as broken rows rather
 * than as an error, so keeping it out of reach is the whole point. The extra
 * `<name>/` level under `tables/` leaves room for Hive partitions
 * (`tables/stats/league=Allflame/…`) without moving anything.
 */
export function artifactsFor(bucket: string, name: string): Artifacts {
  const put = (key: string, body: string, contentType: string) =>
    putObject(bucket, key, body, contentType);

  return {
    json: (value) =>
      put(`json/${name}.json`, `${JSON.stringify(value, null, 2)}\n`, "application/json"),

    ndjson: (rows) => {
      const lines = rows.map((row) => JSON.stringify(row));
      return put(
        `tables/${name}/${name}.ndjson`,
        lines.length === 0 ? "" : `${lines.join("\n")}\n`,
        "application/x-ndjson",
      );
    },

    meta: (source, totals) => {
      const meta = {
        generatedAt: new Date().toISOString(),
        source,
        league: optionalEnv("POE_LEAGUE") ?? null,
        totals,
      };
      return put(
        `meta/${name}.meta.json`,
        `${JSON.stringify(meta, null, 2)}\n`,
        "application/json",
      );
    },
  };
}
