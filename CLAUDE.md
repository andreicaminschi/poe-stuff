# poe-stuff

Yarn 4 workspace monorepo of TypeScript packages for Path of Exile item filters. No build
step — Node runs the `.ts` files directly.

## Purpose

The product is a `.filter` file: given every item the game can show and what each one is
worth, decide how loudly to draw it.

Two halves feed that. The first makes rate-limited requests to GGG without earning a ban —
`@poe/ggg` paces every request behind a limiter the server's own headers keep updated. The
second reads the filter language: `@poe/item-parser` turns one item's copied text into a
shape the language can be asked about, and `@poe/filter-eval` parses a `.filter` and decides
which block takes an item.

**Nothing generates a filter yet.** That is `apps/generator`, and it is the missing spine —
until something comes out of it, every source collected here is a leaf and nothing proves
the whole works.

## Tiers

Code is split by **where it runs**, not by what it is about. This is the rule for where new
code goes:

| Tier | Runs where | Rule |
| --- | --- | --- |
| `services/` | backend | One outside API, one object. Reads no environment. |
| `lib/` | anywhere — node today, a desktop app later | Pure. Imported, never runs on its own. No `process.env`, no database client, no cloud SDK. |
| `apps/` | backend | Has a `main()`. Owns its `.env`. Never imported by anything. |
| `packages/` | — | **Deprecated only.** The graveyard. Emptied as each POC is replaced. |

An app has a CLI and reads the environment; a lib has neither. If a new file needs
`requireEnv`, it belongs in an app.

## Structure

```
services/ggg/          # @poe/ggg — the GGG trade API behind a rate limiter. Has a README.md
services/poe-watch/    # @poe/poe-watch — league price digests from api.poe.watch. Has a README.md
services/poe-ninja/    # @poe/poe-ninja — one league's market off poe.ninja. Has a README.md
services/repoe/        # @poe/repoe — the game's own item, gem, spectre and essence data. Has a README.md
lib/filter-eval/       # @poe/filter-eval — parse and run a .filter. Depends on nothing. Has a README.md
lib/item-parser/       # @poe/item-parser — one item's copied text, parsed and matched
lib/cache/             # @util/cache — cache-key, file-cache, sleep
lib/env/               # @util/env — requireEnv / optionalEnv. The only reader of process.env
apps/item-inspect/     # @poe/item-inspect — paste an item, see how the parser read it
apps/collector/        # README only. Replaces @poe/workers
apps/catalog/          # README only. Replaces @poe/filterv2
apps/generator/        # README only. Never existed: items + prices -> a .filter
packages/workers/      # DEPRECATED @poe/workers. Does not compile
packages/filterv2/     # DEPRECATED @poe/filterv2
.s3/                   # local stand-in for object storage. Gitignored, nothing writes it yet
data/sample-items/     # copied item text, the parser's fixtures. Two suites read this folder
data/                  # everything else here is scratch and gitignored
docs/                  # item-filter-syntax.md — the .filter grammar as GGG documents it
docs/plans/            # feature plans. Gitignored and never pushed
research/              # design notes, archived. Not a spec of what is built
queries.json           # hand-written trade searches. Belongs to the deprecated collector
influence-queries.json # generated, 2 MB, tracked. Belongs to the deprecated collector
techdebt.md            # what the repo knowingly duplicates and does not do yet
tsconfig.json          # one config. Type-checks apps, lib and services — not packages
jest.config.js         # plain .js: jest loads config before any transform exists
eslint.config.ts       # flat config
```

## Services

A service is one outside API behind one object. It exposes `create<Name>Service(options)`
from `./service` and nothing else callable; endpoints live beside it as a `.ts` +
`.types.ts` pair, and `call.ts`, `config.ts` and the mappers stay internal.

**A service reads no environment.** Base URL, user agent and cache are all arguments to the
constructor, with defaults for everything except GGG's user agent — GGG asks that it name a
reachable contact, and a default would send one that does not exist. No service holds a
`.env`; a consumer reads its own and hands the values over.

| Service | Import as | Owns |
| --- | --- | --- |
| `@poe/ggg` | `@poe/ggg/service`, `/get-item-data.types`, `/get-stats.types`, `/search-listings.types`, `/fetch-listings.types`, `/errors`, `/types` | The GGG trade API: every endpoint bound to one rate limiter the server's own headers keep updated. Owns every GGG URL. See [services/ggg/README.md](services/ggg/README.md). |
| `@poe/poe-watch` | `@poe/poe-watch/service`, `/get-compact-data.types`, `/get-corruption-data.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | The PoeWatch price digests: one league's whole market per call, the corrupted-implicit outcomes per item, and the exchange book. A third party scraping trade listings, which is why a price from here is a listing rather than a sale. `/compact` needs `all=true` or it answers without a single crafting base. **Nothing imports it yet.** See [services/poe-watch/README.md](services/poe-watch/README.md). |
| `@poe/poe-ninja` | `@poe/poe-ninja/service`, `/get-leagues.types`, `/get-item-overview.types`, `/get-exchange-overview.types`, `/get-league-items.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | poe.ninja's economy API, as a second opinion on the market PoeWatch scrapes. One league is 28 item calls plus 18 exchange calls — there is no whole-market endpoint. **Nothing imports it yet.** What a row *is* comes from the `type` that was asked for; `itemClass` is unusable and is read nowhere. See [services/poe-ninja/README.md](services/poe-ninja/README.md). |
| `@poe/repoe` | `@poe/repoe/service`, `/get-base-items.types`, `/get-gems.types`, `/get-spectres.types`, `/get-essences.types`, `/errors`, `/types` | RePoE's exports: the game's own data files, unpacked after each patch and served as static JSON off GitHub Pages. Carries no prices — this is what the game knows about an item, not what the market thinks of it. Four endpoints, each the whole file in one request with no query and no way to ask for less: `base_items.json`, `Gems.min.json`, `Spectres.json` and `Essence.min.json`. They share no vocabulary and nothing here reconciles them. Only two take the `.min` variant — `Spectres.min.json` is published empty, and `base_items.min.json` drops null keys rather than whitespace. **Nothing live imports it** — only the deprecated `@poe/filterv2` does. `item_class` is GGG's internal name, not the `Class` a `.filter` matches on. See [services/repoe/README.md](services/repoe/README.md). |

## Libraries

Pure and imported. Anything here has to keep running when it is loaded somewhere with no
filesystem and no environment, because a desktop client is the plan.

| Library | Import as | Owns |
| --- | --- | --- |
| `@poe/filter-eval` | `@poe/filter-eval/parse-filter`, `/evaluate-filter`, `/filter-ast`, `/format-note` | The `.filter` grammar as code: a parser, an evaluator that decides which block takes an item, and the `#@` note a generated block carries its bucket in. **Depends on nothing, on purpose** — it is the independent reader that checks whatever wrote a filter, and sharing a types file with the writer would end that. See [lib/filter-eval/README.md](lib/filter-eval/README.md). |
| `@poe/item-parser` | `@poe/item-parser/parse-item`, `/resolve-item`, `/to-filter-item`, `/match-mods`, `/mod-text`, `/parse-header`, `/parse-mods`, `/parse-properties`, `/sections`, `/types` | One item's copied text, read back. `parseItem` is pure and needs nothing; `resolveItem` looks each modifier up in GGG's published stat list to get the ids the trade site knows it by; `toFilterItem` turns the result into the shape `@poe/filter-eval` asks conditions about. Nothing about any modifier is written down — matching is against published text, so a modifier that ships next league matches the day it appears. |
| `@util/cache` | `@util/cache/cache-key`, `/file-cache`, `/sleep` | `cacheKey` for stable file and map keys. `fileCache<T>` — JSON on disk, one file per key, backing every service's response cache. `sleep` is a promise around `setTimeout`. |
| `@util/env` | `@util/env` | `requireEnv` / `optionalEnv` — the only place `process.env` is read, so a missing variable fails with one message that names it. **The exception to the purity rule, and app-only**: no other library may import it. |

### Nothing in `lib/` imports a service

Not even for a type. `@poe/item-parser` needs GGG's published stat list, and declares the
shape it needs itself — `PublishedStat` in [lib/item-parser/types.ts](lib/item-parser/types.ts).
`createGGGService(…).getStats()` answers with exactly that shape, so a caller passes it
straight in and no adapter exists anywhere.

That is the rule and not an accident of this one case: a library is handed its input and
never learns where the input came from. The moment a lib names a service in its
`dependencies`, it stops being loadable anywhere the service is not.

## Apps

One is written. The other three hold a `README.md` naming what they will own, which POC
they replace, and what has to be decided first.

| App | Replaces | Owns |
| --- | --- | --- |
| [`apps/item-inspect`](apps/item-inspect/README.md) | — | **Written.** Paste an item copied out of the game, see how the parser read it. The one consumer of `@poe/item-parser` today, and where its CLI lives now that `lib/` is pure. |
| [`apps/collector`](apps/collector/README.md) | `@poe/workers` | The worker loop, the job handlers, the record of outstanding work, the writes into `.s3`, and `queries.json`. |
| [`apps/catalog`](apps/catalog/README.md) | `@poe/filterv2` | **The catalog**: one row per item the game can show, carrying everything the generator needs to decide a bucket — identity *and* value. Fans in across GGG's `/data/items`, the Currency Exchange, RePoE and poe.watch. The generator is its only consumer. |
| [`apps/generator`](apps/generator/README.md) | nothing — new | `(items, prices, config) -> a .filter file`. The spine. |

## Deprecated

`packages/` holds POC code being replaced. **Do not add to it and do not import it.** Each
folder has a `DEPRECATED.md` saying what replaces it and what is worth carrying over.

| Package | State |
| --- | --- |
| [`packages/workers`](packages/workers/DEPRECATED.md) | **Does not compile.** `@poe/ledger` and `@poe/poe-wiki` were deleted and it imports both. Kept for `docs/pipeline.md`, which is the collection design in full. |
| [`packages/filterv2`](packages/filterv2/DEPRECATED.md) | Compiles. Its fourth source — the league's forum post — came out with the forum endpoints on `@poe/ggg`, so it merges three and no longer sees a league launch. Kept for `notes.md` — what the item-list build gets wrong and has not decided, which are decisions about the game rather than about the code. |

Both are excluded from `tsconfig.json` and `jest.config.js`, so `yarn typecheck` stays a
signal instead of being permanently red.

## Storage

**S3 is the local disk at `./.s3`.** No object-storage service to run, no credentials, no
client library — everything is a file, which means a page can be opened in an editor while
a run is going.

```
.s3/            what the collector writes: one file per page, per collected hour
.s3/.cache/     cached responses, one file per request
```

All of it is gitignored, and all of it is re-fetchable. Whatever cannot be regenerated is
what will need a backup, and it is not in here.

**Nothing writes there yet.** This is the decided shape, not the current state: `.s3` is a
rule for `apps/collector` to be built against, and that app does not exist. The only
storage code in the tree is the deprecated `@poe/workers`, which still carries
`@aws-sdk/client-s3` and writes to a real bucket named by `S3_URL` and `S3_BUCKET`. That is
one of the reasons it is deprecated rather than kept, and the SDK leaves with it.

AWS is the eventual target. Nothing in the live tree assumes it, and no third-party service
is configured or documented until it is real.

## Layout inside a package

**One folder level, never deeper.** A feature is `{feature}.ts` at the package root, and the
functions it calls live in `{feature}/`. A nested `{feature}/{part}/{piece}.ts` buries the
logic and makes the import path longer than the function it points at.

```
apps/catalog/build-catalog.ts            the feature
apps/catalog/build-catalog/*.ts          what it calls
```

**One function per file is a rule of thumb, not a law: split when a test against that
function would be meaningful.** A parser, a fetch, a decision — each earns its own file. A
semantic wrapper over one `map`, `filter` or `Set` round-trip does not, and stays inline
where it is used.

A CLI is `{feature}-cli.ts` at the package root, and belongs to an app. Anything another
package imports needs a line in the `exports` map of its `package.json`; a file under
`{feature}/` is private by not being listed. Inside a package, imports stay relative and
keep `.ts`.

## Toolchain rules

Node 26 strips types to run `.ts`; `tsc` only type-checks (`noEmit`). Enforced by
`erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties.
- Relative imports keep the extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

One root `tsconfig.json` (`include: ["apps/**/*.ts", "lib/**/*.ts", "services/**/*.ts"]`)
checks every live package across boundaries. No project references, no per-package configs.

Jest transforms with `@swc/jest` and emits real ESM, so it needs
`--experimental-vm-modules` — that flag lives in the `test` script, not in a runner config.
Tests are `*.test.ts` beside their source.

`yarn typecheck` before considering a change done.

## Environment

No `.env` is committed — every one is gitignored and written by hand. Each app loads its
own via `node --env-file=apps/<name>/.env <script>`; `requireEnv` throws at first use, not
at import, so a code path that needs no variable runs without one.

**Nothing under `services/` or `lib/` appears below.** A service takes its base URL, user
agent and cache as constructor options, so a consumer that wants to configure from the
environment reads its own vars and passes the values to `create<Name>Service`. No library
reads the environment either — `@util/env` exists to be imported by apps.

| Var | Holds | Read by |
| --- | --- | --- |
| `POE_USER_AGENT` | `user-agent` sent on every outbound request. Must name the app and a real contact address. No service reads it — they take `userAgent` as an option, and GGG refuses to default it, because a default would send a contact that does not exist | [apps/item-inspect/item-cli.ts](apps/item-inspect/item-cli.ts), and the deprecated `@poe/filterv2` |

That is the whole live surface: **one variable.** Every other name still read anywhere in
the tree belongs to `packages/workers`, which does not compile, and its `.env` names things
whose packages were deleted. `apps/` will declare its own, and this table is where they get
written down.

## Gotchas

- **Workspace symlinks are load-bearing.** Node refuses to type-strip `.ts` under
  `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`) and only gets away with it
  here because yarn symlinks workspaces and Node realpaths them first. Never enable
  `install-links` or nohoist-style copying — it breaks every cross-package import at once.
- **One limiter is one IP.** Limiter state is per-instance, per-process, nothing persisted.
  Two limiters in one process means twice the real rate against a single budget, and GGG
  counts the total. Two processes on two machines are two budgets and are fine.
- **Declare what you import.** Several packages used to import `@util/core` without listing
  it and resolved only through yarn hoisting. Combined with the symlink rule above, that is
  a break waiting to happen — a new cross-package import needs a line in `dependencies`.

## How to run

Type-check every live package:

```bash
yarn typecheck
```

Run the tests, or one package's:

```bash
yarn test services/ggg
```

Paste a copied item and see how the parser read it:

```bash
node --env-file=apps/item-inspect/.env apps/item-inspect/item-cli.ts data/sample-items/rare-ring.txt
```

## Docs

Every service has a `README.md`; `services/ggg` also has Mermaid `.mmd` diagrams in
`services/ggg/docs/`. `lib/filter-eval` has a `README.md`.

`lib/item-parser`, `lib/cache` and `lib/env` have none. Write one with the `/document`
command.

`apps/item-inspect` has a `README.md`.

The other three folders under `apps/` have a `README.md` describing what does not exist yet. Each folder
under `packages/` has a `DEPRECATED.md`.

[docs/item-filter-syntax.md](docs/item-filter-syntax.md) is how filters work in PoE: the
`.filter` grammar as GGG documents it — `Show`/`Hide`/`Minimal` blocks, `Continue`,
`Import`, the operators, every condition and every action. Anything the generator emits has
to be a line in there.

**Tech debt goes in [techdebt.md](techdebt.md) at the root, never in a package.** One
section per package, one heading per note: what the repo knowingly duplicates and what it
knowingly does not do yet. A package does not get a `techdebt.md` of its own — a note is
only read where somebody already looks, and that is one file at the root. Say what is wrong,
why it was left, and what undoing it costs; take a note out once it is fixed.

`docs/plans/` holds a plan per feature, written before the work starts. **It is gitignored
and is never pushed.** Write one there, keep it there, and do not reference it from a file
that is committed — a link into `docs/plans/` is a broken link for everybody else.

`research/` holds design notes written before the code — treat them as history, not as a
description of what exists.
