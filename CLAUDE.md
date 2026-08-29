# poe-stuff

Yarn 4 workspace monorepo of TypeScript packages for polling GGG's Path of Exile trade
API. No build step — Node runs the `.ts` files directly.

## Purpose

Everything here exists to make rate-limited requests to GGG without earning a ban:
`@poe/ggg` paces requests behind a limiter the server's own headers keep updated, and
`@poe/workers` wraps the two trade endpoints on top of it and runs the queue workers. It
also sinks the Currency Exchange hourly digests, which come off the CDN under no budget
at all.

The second half is the item filter. `@poe/filterv2` builds the roster — every item the
game can show, named and flagged, merged out of the trade site, the Currency Exchange,
RePoE and the league's forum post. `@poe/item` reads one item's copied text back into a
shape the filter language can be asked about, and `@poe/filter-eval` parses a `.filter`
and decides which block takes an item. None of the three carries a price.

What is not in the repo today: no schema validation of response bodies. The only schedule
is the currency sweep, and it is a BullMQ job scheduler in redis rather than a cron.
`compose.yaml` runs the backing services; `@poe/workers` connects to redis, minio and the
ledger postgres, the rest are unused so far.

## Structure

```
services/ggg/          # @poe/ggg — the GGG trade API behind a rate limiter. Has a README.md
services/poe-watch/    # @poe/poe-watch — league price digests from api.poe.watch. Has a README.md
services/poe-ninja/    # @poe/poe-ninja — one league's market off poe.ninja. Has a README.md
services/repoe/        # @poe/repoe — the game's own item data, unpacked. Has a README.md
packages/ledger/       # @poe/ledger — job, cohort and currency-hour tables on postgres
packages/workers/      # @poe/workers — queue workers, job handlers, CLIs
packages/util/         # @util/core — env, cache-key, file-cache, sleep
packages/poe-wiki/     # @poe/poe-wiki — Cargo queries against poewiki.net
packages/filterv2/     # @poe/filterv2 — every item the game can show, as one JSON file. Has a README.md
packages/item/         # @poe/item — one item's copied text, parsed and matched
packages/filter-eval/  # @poe/filter-eval — parse and run a .filter. Depends on nothing
research/              # design notes, archived. Not a spec of what is built
trino/                 # Dockerfile + catalog for the trino service in compose.yaml
compose.yaml           # redis, minio, ledger postgres, hive metastore + postgres, trino
tsconfig.json          # one config, type-checks every package
jest.config.js         # plain .js: jest loads config before any transform exists
eslint.config.ts       # flat config. No `lint` script in package.json
```

## Services

A service is one outside API behind one object. It exposes `create<Name>Service(options)`
from `./service` and nothing else callable; endpoints live beside it as a `.ts` + `.types.ts`
pair, and `call.ts`, `config.ts` and the mappers stay internal.

**A service reads no environment.** Base URL, user agent and cache are all arguments to the
constructor, with defaults for everything except GGG's user agent — GGG asks that it name a
reachable contact, and a default would send one that does not exist. No service holds a
`.env`; a consumer reads its own and hands the values over.

| Service | Import as | Owns |
| --- | --- | --- |
| `@poe/ggg` | `@poe/ggg/service`, `/get-item-data.types`, `/get-static-items.types`, `/get-stats.types`, `/search-listings.types`, `/fetch-listings.types`, `/errors`, `/types` | The GGG trade API: every endpoint bound to one rate limiter the server's own headers keep updated. Owns every GGG URL. See [services/ggg/README.md](services/ggg/README.md). |
| `@poe/poe-watch` | `@poe/poe-watch/service`, `/get-compact-data.types`, `/get-corruption-data.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | The PoeWatch price digests: one league's whole market per call, the corrupted-implicit outcomes per item, and the exchange book. A third party scraping trade listings, which is why a price from here is a listing rather than a sale. `/compact` needs `all=true` or it answers without a single crafting base. See [services/poe-watch/README.md](services/poe-watch/README.md). |
| `@poe/poe-ninja` | `@poe/poe-ninja/service`, `/get-leagues.types`, `/get-item-overview.types`, `/get-exchange-overview.types`, `/get-league-items.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | poe.ninja's economy API, as a second opinion on the market PoeWatch scrapes. One league is 28 item calls plus 18 exchange calls — there is no whole-market endpoint. **Nothing imports it yet.** What a row *is* comes from the `type` that was asked for; `itemClass` is unusable and is read nowhere. See [services/poe-ninja/README.md](services/poe-ninja/README.md). |
| `@poe/repoe` | `@poe/repoe/service`, `/get-base-items.types`, `/errors`, `/types` | RePoE's exports: the game's own data files, unpacked after each patch and served as static JSON off GitHub Pages. Carries no prices — this is what the game knows about an item, not what the market thinks of it. One endpoint, `base_items.json`: every base in the game, the whole export in one request with no query and no way to ask for less. **Nothing imports it yet.** `item_class` is GGG's internal name, not the `Class` a `.filter` matches on. See [services/repoe/README.md](services/repoe/README.md). |

## Packages

| Package | Import as | Owns |
| --- | --- | --- |
| `@util/core` | `@util/core/env`, `/cache-key`, `/file-cache`, `/sleep` | `requireEnv`/`optionalEnv` — the only place `process.env` is read. `cacheKey` for stable S3/Redis keys. `fileCache<T>` — JSON on disk, one file per key, backing both the GGG response cache and the PoeWatch digest cache. |
| `@poe/ledger` | `@poe/ledger/db`, `/migrate`, `/cohorts`, `/jobs`, `/currency`, `/types` | The job ledger on postgres: cohort rows, job rows, the queries that decide completion, and one row per collected currency hour. |
| `@poe/poe-wiki` | `@poe/poe-wiki/get-unique-items`, `/get-influence-mods`, `/get-corrupted-mods`, `/get-exceptional-gems`, `/get-transfigured-gems`, `/cargo`, `/wiki-text`, `/types` | The wiki's Cargo tables. `getUniqueItems` — every unique's name, base item, item class and drop-restriction flag. `getInfluenceMods` — every influence modifier by equipment slot, with spawn weight. `getCorruptedMods` — the corrupted-implicit pool a Vaal Orb draws from, weighted per item class. `getExceptionalGems` and `getTransfiguredGems` — which gems cap below level 20, and which were cut from a Divine Font. Not GGG, and the only source for any of it. |
| `@poe/filterv2` | `@poe/filterv2/build-item-list`, `/types` | The roster: every item a `.filter` could name, written to one JSON file. Merges GGG's `/data/items`, the Currency Exchange, RePoE's `base_items.json` and the league's Item Filter Information forum post, and marks the rows where they disagree. **No prices** — this answers what exists, not what it is worth. Reads the forum post by shelling out to `claude -p`. See [packages/filterv2/README.md](packages/filterv2/README.md) and [notes.md](packages/filterv2/notes.md). |
| `@poe/item` | `@poe/item/parse-item`, `/resolve-item`, `/to-filter-item`, `/match-mods`, `/mod-text`, `/parse-header`, `/parse-mods`, `/parse-properties`, `/sections`, `/types` | One item's copied text, read back. `parseItem` is pure and needs nothing; `resolveItem` looks each modifier up in GGG's published stat list to get the ids the trade site knows it by; `toFilterItem` turns the result into the shape `@poe/filter-eval` asks conditions about. Nothing about any modifier is written down — matching is against published text, so a modifier that ships next league matches the day it appears. **Does not typecheck today**: it still imports the pre-service `@poe/ggg` API. See [packages/item/techdebt.md](packages/item/techdebt.md). |
| `@poe/filter-eval` | `@poe/filter-eval/parse-filter`, `/evaluate-filter`, `/filter-ast`, `/format-note` | The `.filter` grammar as code: a parser, an evaluator that decides which block takes an item, and the `#@` note a generated block carries its bucket in. Depends on no other package on purpose — it is the independent reader that checks what wrote a filter. |
| `@poe/workers` | `@poe/workers/worker`, `/handlers`, `/queries`, `/queues`, `/keys`, `/pages`, `/file-cache` | The BullMQ worker loop and job handlers, S3 writes, and the `cohort-cli.ts`/`worker-cli.ts`/`currency-cli.ts` entry points. Calls GGG through `@poe/ggg` and owns no URLs of its own. |

Cross-package imports resolve through the `exports` map in that package's
`package.json`. A new public entry point needs a line added there; anything absent is
correctly unreachable. Inside a package, imports stay relative and keep `.ts`.

## Layout inside a package

**One folder level, never deeper.** A feature is `{feature}.ts` at the package root, and
the functions it calls live in `{feature}/`. A nested `{feature}/{part}/{piece}.ts` buries
the logic and makes the import path longer than the function it points at.

```
packages/filterv2/build-roster.ts          the feature
packages/filterv2/build-roster/*.ts        what it calls
```

**One function per file is a rule of thumb, not a law: split when a test against that
function would be meaningful.** A parser, a fetch, a decision — each earns its own file. A
semantic wrapper over one `map`, `filter` or `Set` round-trip does not, and stays inline
where it is used.

A CLI is `{feature}-cli.ts` at the package root. Anything a CLI or another package imports
needs a line in the `exports` map; a file under `{feature}/` is private by not being
listed.

## Toolchain rules

Node 26 strips types to run `.ts`; `tsc` only type-checks (`noEmit`). Enforced by
`erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties.
- Relative imports keep the extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

One root `tsconfig.json` (`include: ["packages/**/*.ts", "services/**/*.ts"]`) checks every package across
boundaries. No project references, no per-package configs.

Jest transforms with `@swc/jest` and emits real ESM, so it needs
`--experimental-vm-modules` — that flag lives in the `test` script, not in a runner
config. Tests are `*.test.ts` beside their source.

`yarn typecheck` before considering a change done.

## Environment

No `.env` file exists in the tree. Each package loads its own via
`node --env-file=packages/<name>/.env <script>`; `requireEnv` throws at first use, not at
import.

**Nothing under `services/` appears below.** A service takes its base URL, user agent and
cache as constructor options, so the vars that used to configure GGG, PoeWatch and
poe.ninja — `POE_TRADE_API_URL`, `POE_CURRENCY_API_URL`, `POE_WATCH_BASE_URL`,
`POE_NINJA_BASE_URL`, `POE_WATCH_CACHE_DIR`, `POE_NINJA_CACHE_DIR`, `POE_NINJA_LEAGUE` —
are read by nobody. A consumer that wants to keep configuring from the environment reads
its own vars and passes the values to `create<Name>Service`.

| Var | Holds | Read by |
| --- | --- | --- |
| `POE_USER_AGENT` | `user-agent` sent on every outbound request. Must name the app and a real contact address. The three services no longer read it — they take `userAgent` as an option, and GGG refuses to default it | [packages/poe-wiki/cargo.ts](packages/poe-wiki/cargo.ts), [packages/filterv2/build-item-list-cli.ts](packages/filterv2/build-item-list-cli.ts) |
| `POE_CURRENCY_LEAGUE` | The one league kept out of each hourly digest. Every league arrives in one payload and there is no server-side filter | [packages/workers/config.ts](packages/workers/config.ts) |
| `POE_CURRENCY_FROM` | Oldest hour to collect: a unix timestamp or a date. Set by hand — GGG will not say how far its history goes, and this is what stops a sweep walking back to 1970 | [packages/workers/config.ts](packages/workers/config.ts) |
| `POE_WIKI_BASE_URL` | Base of poewiki.net, trailing slash stripped. A MediaWiki, not GGG — no rate limits published and no GGG budget touched | [packages/poe-wiki/cargo.ts](packages/poe-wiki/cargo.ts) |
| `POE_WIKI_CACHE_DIR` | Folder holding the cached unique-item export, one file per hour. Optional — unset means every call re-queries the wiki. An hour is a courtesy to somebody else's server, not a freshness policy: the list only moves on a league boundary | [packages/poe-wiki/get-unique-items.ts](packages/poe-wiki/get-unique-items.ts) |
| `CACHE_DIR` | Folder a consumer builds a `ResponseCache` from and hands to `createGGGService`. Optional, local only — unset means every request goes to GGG, which is what production wants | [packages/workers/file-cache.ts](packages/workers/file-cache.ts) |

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
yarn test services/ggg
```

Start the local stack:

```bash
docker compose up -d
```

Build the item list — merge GGG, RePoE and the league's forum post into one JSON file:

```bash
node --env-file=packages/filterv2/.env packages/filterv2/build-item-list-cli.ts
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

Every service has a `README.md`; `services/ggg` also has Mermaid `.mmd` diagrams in
`services/ggg/docs/`.
`packages/workers` has `docs/pipeline.md` with `pipeline.mmd` and `currency.mmd` beside
it, but no README.
`packages/filterv2` has a `README.md` and Mermaid `.mmd` diagrams beside the files they
draw. It also has `notes.md`, the known gaps in the item list — what the build gets wrong
and what it has not decided yet, written down where the next person looks rather than in a
commit message.

`packages/item` has `techdebt.md`, what the package knowingly duplicates and knowingly does
not do yet, written because it was built without editing anything outside itself.

`packages/item`, `packages/ledger` and `packages/poe-wiki` have no README. Write one with
the `/document` command.

[docs/item-filter-syntax.md](docs/item-filter-syntax.md) is how filters work in PoE: the
`.filter` grammar as GGG documents it — `Show`/`Hide`/`Minimal` blocks, `Continue`,
`Import`, the operators, every condition and every action. Anything the filter code emits
has to be a line in there.

`research/` holds design notes written before the code — treat them as history, not as a
description of what exists.
