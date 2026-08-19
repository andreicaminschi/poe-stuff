# poe-stuff

Yarn 4 workspace monorepo of TypeScript packages for polling GGG's Path of Exile trade
API. No build step — Node runs the `.ts` files directly.

## Purpose

Everything here exists to make rate-limited requests to GGG without earning a ban:
`@poe/ggg` paces requests behind a limiter the server's own headers keep updated, and
`@poe/workers` wraps the two trade endpoints on top of it and runs the queue workers.

What is not in the repo today: no scheduler, no schema validation of response bodies.
`compose.yaml` runs the backing services; `@poe/workers` connects to redis, minio and the
ledger postgres, the rest are unused so far.

## Structure

```
packages/ggg/          # @poe/ggg — HTTP client + rate limiter. Has its own README.md
packages/ledger/       # @poe/ledger — job + cohort tables on postgres
packages/workers/      # @poe/workers — trade endpoint wrappers, queue workers, CLIs
packages/util/         # @util/core — env, cache-key, sleep
research/              # design notes, archived. Not a spec of what is built
trino/                 # Dockerfile + catalog for the trino service in compose.yaml
compose.yaml           # redis, minio, ledger postgres, hive metastore + postgres, trino
tsconfig.json          # one config, type-checks every package
jest.config.js         # plain .js: jest loads config before any transform exists
eslint.config.ts       # flat config. No `lint` script in package.json
```

## Packages

| Package | Import as | Owns |
| --- | --- | --- |
| `@poe/ggg` | `@poe/ggg/call`, `/rate-limiter`, `/parse-rate-limit-headers`, `/errors`, `/types` | One request through a limiter; rate-limit header parsing; `GggHttpError`. Knows no URLs. See [packages/ggg/README.md](packages/ggg/README.md). |
| `@util/core` | `@util/core/env`, `/cache-key`, `/sleep` | `requireEnv`/`optionalEnv` — the only place `process.env` is read. `cacheKey` for stable S3/Redis keys. |
| `@poe/ledger` | `@poe/ledger/db`, `/migrate`, `/cohorts`, `/jobs`, `/types` | The job ledger on postgres: cohort rows, job rows, and the queries that decide completion. |
| `@poe/workers` | `@poe/workers/worker`, `/handlers`, `/queries`, `/queues`, `/keys`, `/pages`, `/file-cache`, `/types` | `postSearch`, `fetchPage`, the BullMQ worker loop and job handlers, S3 page writes, and the `cohort-cli.ts`/`worker-cli.ts` entry points. |

Cross-package imports resolve through the `exports` map in that package's
`package.json`. A new public entry point needs a line added there; anything absent is
correctly unreachable. Inside a package, imports stay relative and keep `.ts`.

## Toolchain rules

Node 26 strips types to run `.ts`; `tsc` only type-checks (`noEmit`). Enforced by
`erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties.
- Relative imports keep the extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

One root `tsconfig.json` (`include: ["packages/**/*.ts"]`) checks every package across
boundaries. No project references, no per-package configs.

Jest transforms with `@swc/jest` and emits real ESM, so it needs
`--experimental-vm-modules` — that flag lives in the `test` script, not in a runner
config. Tests are `*.test.ts` beside their source.

`yarn typecheck` before considering a change done.

## Environment

No `.env` file exists in the tree. Each package loads its own via
`node --env-file=packages/<name>/.env <script>`; `requireEnv` throws at first use, not at
import.

| Var | Holds | Read by |
| --- | --- | --- |
| `POE_USER_AGENT` | `user-agent` sent on every GGG request. Must name the app and a real contact address | [packages/ggg/call.ts](packages/ggg/call.ts) |
| `POE_TRADE_API_URL` | Base of the trade API, trailing slash stripped | [packages/workers/config.ts](packages/workers/config.ts) |

`compose.yaml` reads its own set (`MINIO_ROOT_USER`, `REDIS_PORT`, `LEDGER_USER`,
`LEDGER_PORT`, `TRINO_PORT`, …), all with defaults, from the shell or a root `.env` that
does not exist yet.

## Gotchas

- **Workspace symlinks are load-bearing.** Node refuses to type-strip `.ts` under
  `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) and only gets away with
  it here because yarn symlinks workspaces and Node realpaths them first. Never enable
  `install-links` or nohoist-style copying — it breaks every cross-package import at once.
- **One limiter is one IP.** Limiter state is per-instance, per-process, nothing
  persisted. Two limiters in one process means twice the real rate against a single
  budget, and GGG counts the total.
- **Podman on Windows only mounts `%USERPROFILE%`.** That is why redis takes its config
  as flags and trino bakes catalogs into an image instead of bind-mounting from `F:\`.

## How to run

Type-check the workspace:

```bash
yarn typecheck
```

Run the tests, or one package's:

```bash
yarn test packages/ggg
```

Start the local stack:

```bash
docker compose up -d
```

## Local stack

Production is AWS. The containers exist to stand in for AWS services on a laptop, and
they follow what AWS does — never the other way round. A local service is configured to
match its AWS counterpart's version and behaviour; where the two disagree, AWS is right
and the container is what gets changed. Nothing is designed around a container's
convenience, and nothing depends on one being present in production.

| Service | Port (localhost) | Stands in for | Why |
| --- | --- | --- | --- |
| redis | 6379 | Redis | Queue backend. `noeviction` — BullMQ jobs and locks are plain keys, so an eviction silently drops queue state |
| minio | 9000, console 9001 | S3 | Object storage for artifacts and the page data lake |
| ledger-db | 5432 | RDS/Aurora PostgreSQL | The job ledger: one row per search and per page. Cohort completion is a query against it, not a counter. Holds data nothing else can regenerate |
| metastore-db | — | Glue Data Catalog | Postgres holding the metastore's own schema. Table definitions only, kept apart from `ledger-db` because its recovery story is "re-run the DDL" |
| metastore | 9083 | Glue Data Catalog | Starburst's hive build: bundles the S3 jars, takes MinIO config as env |
| trino | 8080 | Athena | Queries the artifacts through the `minio` catalog |

## Docs

`packages/ggg` has a `README.md` and Mermaid `.mmd` diagrams in `packages/ggg/docs/`.
`packages/workers` has `docs/pipeline.md` and a `.mmd` beside it, but no README.
`packages/util` and `packages/ledger` have neither. Write a package README with the
`/document` command.

`research/` holds design notes written before the code — treat them as history, not as a
description of what exists.
