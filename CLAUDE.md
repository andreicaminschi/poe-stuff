# poe-stuff


## Environment

- Node 26, yarn 1, git
- Endpoints live in each package's own `.env` — read from there rather than hardcoding URLs.

## Monorepo

Yarn 1 workspaces: `packages/*`, one mini-project each. Shared at the root:
`data/`, `tsconfig.json`, `typescript` + `@types/node`, and the `etl:*` run scripts.
Everything else belongs to its package.

Each package owns its `.env` (`packages/<name>/.env`); there is no root one. `POE_USER_AGENT`
and `POE_LEAGUE` are deliberately duplicated across them — changing league means editing both.

Node refuses to type-strip `.ts` under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`),
and only gets away with it here because yarn *symlinks* workspaces and Node realpaths them
first. Never enable nohoist-style copying or `install-links` — it breaks every cross-package
import at once.

Cross-package imports go through the `exports` map in the package's `package.json`, so a new
public entry point needs a line added there; anything absent is correctly unreachable.
Inside a package, imports stay relative and keep the `.ts` extension.

One root `tsconfig.json` (`include: ["packages/**/*.ts"]`) type-checks every package,
across boundaries. No project references, no per-package configs — add them only when a
package genuinely needs different options.

## TypeScript

No build step. Node 26 runs `.ts` directly by stripping types; `tsc` only type-checks
(`noEmit`). Run scripts with `node --env-file=packages/<name>/.env packages/<name>/tools/foo.ts`.

Consequences of type stripping, enforced by `erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties — use `const` objects and
  plain assignment.
- Relative imports keep the `.ts` extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

`yarn typecheck` (or `typecheck:watch`) before considering a change done.

## ETL layout

`packages/etl/pipelines/<domain>/` holds one pipeline per remote endpoint, grouped by
domain rather than by stage. Each domain has the same six files:

- `raw.ts` — zod schema for GGG's wire shape + `parseRawX`. The only trust boundary;
  keep it a faithful mirror, never make the data nicer here.
- `domain.ts` — plain `type`s for the friendly shape. Everything downstream speaks only this.
- `extract.ts` / `transform.ts` / `load.ts` — the stages.
- `pipeline.ts` — composes them into a `Pipeline<Raw, Domain>`.

`packages/etl/core/` is for what every domain needs (http, env, cache, paths, runner,
artifact writers, collision detection, argv) — lift code there only once a second domain
wants it. No `index.ts` barrels: nodenext resolution has no directory-index lookup, so
imports name the real file.

`packages/etl/tools/<domain>.ts` is a thin CLI entry point: `run(xPipeline, parseArgs("x"))`.
`tools/all.ts` runs all five sequentially — GGG rate-limits per account, so don't
parallelise it. Pipelines are listed out there rather than looped because each has its own
`Raw`/`Domain` pair and erasing those costs more than the five lines.

Extracts land in `data/raw/` (gitignored) and the runner reads them back with
`--from-cache`, so iterating on a transform costs no API calls.

Artifacts go to S3 (local MinIO from `compose.yaml`), grouped by role so Athena can point at
them directly:

    tables/stats/stats.ndjson    LOCATION 's3://<bucket>/tables/stats/'
    json/stats.json
    meta/stats.meta.json

An Athena `LOCATION` is a prefix and it reads *every* object under it, recursively, through
one SerDe. So `tables/<name>/` holds that table's rows and nothing else — the pretty JSON
sitting there would parse as broken rows, not raise an error. The `<name>/` level under
`tables/` is where Hive partitions go later (`tables/stats/league=Allflame/…`).

Don't reach for Parquet or gzip here: the biggest artifact is ~2 MB and Athena bills a 10 MB
minimum per query, so every one of these tables already costs the floor. Revisit if a domain
starts producing hundreds of MB.

Each pipeline names the *env var* holding its bucket (`bucketEnv`), not the bucket, so
buckets stay deployment config. All five point at `S3_BUCKET_METADATA` today; splitting one
out is a new var plus one line in its `pipeline.ts`. The runner resolves the var, creates the
bucket if missing, and hands `load` an `Artifacts` bound to that bucket and the pipeline name.

## Gotchas

GGG's ids are unreliable as keys, differently in each endpoint:

- **stats** — 229 ids repeat within the same group with different text.
- **static** — the `sep` row (a dropdown separator, not an item) appears 23 times across 8
  groups. `transform` flags it as `separator`. The `Misc` group has a **null** label.
- **items** — no id at all; `type` is a base name shared by every unique on it. Identity is
  `type` + `name` + `disc`.
- **leagues** — flat rows, one per league *per realm*, so `id` alone collides three ways.
- **filters** — option id `null` is the "Any"/unset sentinel, not missing data. Only `price`
  is both `minMax` and a dropdown.

## .env explained

### POE_STATS_URL (packages/etl/.env)
This is where all the possible stats for the items are found