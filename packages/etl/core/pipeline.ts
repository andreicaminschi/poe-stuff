import { relative } from "node:path";

import type { Artifacts } from "./artifacts.ts";
import { artifactsFor } from "./artifacts.ts";
import { readRaw, writeRaw } from "./cache.ts";
import { requireEnv } from "./env.ts";
import { ROOT } from "./paths.ts";
import { ensureBucket } from "./s3.ts";

/**
 * One ETL run. `Raw` and `Domain` are the two contracts: `Raw` is whatever GGG
 * hands back, `Domain` is the shape we actually want. `parse` is the only step
 * that touches untrusted data.
 */
export type Pipeline<Raw, Domain> = {
  readonly name: string;
  /**
   * Name of the env var holding this pipeline's bucket — the var, not the
   * bucket, so buckets stay deployment config while *which* bucket a pipeline
   * belongs to stays a property of the pipeline. Split a domain out later by
   * pointing it at a different var.
   */
  readonly bucketEnv: string;
  readonly extract: () => Promise<unknown>;
  readonly parse: (input: unknown) => Raw;
  readonly transform: (raw: Raw) => Domain;
  readonly load: (domain: Domain, artifacts: Artifacts) => Promise<readonly string[]>;
};

export type RunOptions = {
  /** Reuse `data/raw/<name>.json` instead of hitting the API. */
  readonly fromCache: boolean;
};

export async function run<Raw, Domain>(
  pipeline: Pipeline<Raw, Domain>,
  options: RunOptions,
): Promise<void> {
  const startedAt = Date.now();
  const log = (message: string) => console.error(`[${pipeline.name}] ${message}`);

  const bucket = requireEnv(pipeline.bucketEnv);
  const input = await extractInput(pipeline, options, log);

  log("parse");
  const raw = pipeline.parse(input);

  log("transform");
  const domain = pipeline.transform(raw);

  log(`load -> s3://${bucket}`);
  await ensureBucket(bucket);
  for (const uri of await pipeline.load(domain, artifactsFor(bucket, pipeline.name))) {
    log(`  wrote ${uri}`);
  }

  log(`done in ${Date.now() - startedAt}ms`);
}

async function extractInput<Raw, Domain>(
  pipeline: Pipeline<Raw, Domain>,
  options: RunOptions,
  log: (message: string) => void,
): Promise<unknown> {
  if (options.fromCache) {
    const cached = await readRaw(pipeline.name);
    if (cached !== undefined) {
      log("extract (cached)");
      return cached;
    }
    log("extract (cache miss)");
  } else {
    log("extract");
  }

  const fetched = await pipeline.extract();
  const path = await writeRaw(pipeline.name, fetched);
  log(`  cached ${relative(ROOT, path)}`);
  return fetched;
}
