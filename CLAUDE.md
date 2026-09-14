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

**Nothing writes a styled `.filter` today.** `apps/generator` did, as a proof of concept, and
was deleted rather than reworked: it read tier floors in Chaos and nothing else, and a category
whose rungs are stack sizes rather than prices does not fit that shape. The catalog still
produces everything such a tool needs, so what replaces it starts from `catalog.json`.
`yarn catalog:compile` writes an unstyled `.filter`, one `Show` block per row or variant, so
the game client can say which condition lines it rejects. It checks the taxonomy and is not
the product.

[README.md](README.md) describes the product end to end: the pipeline from taxonomy to
`.filter`, the catalog's row contract, and what the generator has and has not decided.

## Tiers

Code is split by **where it runs**, not by what it is about. This is the rule for where new
code goes:

| Tier | Runs where | Rule |
| --- | --- | --- |
| `services/` | backend | One outside API, one object. Reads no environment. |
| `lib/` | anywhere — node today, a desktop app later | Pure. Imported, never runs on its own. No `process.env`, no database client, no cloud SDK. |
| `apps/` | backend | Has a `main()`. Owns its `.env`. Never imported by anything. |
| `apps/admin-panel/` | desktop | Two halves. `main.ts` and `api/` are Electron's main process and follow the `apps/` rule. `renderer/` is the React window and never touches Node. |
| `packages/` | — | **Deprecated only.** The graveyard. Emptied as each POC is replaced. |

An app has a CLI and reads the environment; a lib has neither. If a new file needs
`requireEnv`, it belongs in an app.

**Where a new panel file goes.** Something the window draws goes in
`apps/admin-panel/renderer/`. That folder is a project root of its own — a React app that
could be deployed to a browser alone — so the one-folder-level rule starts again inside it.
Inside it, `panels/` and `dialogs/` read the session store (`session-store.ts`) and the hooks
in `hooks/`. `components/` take props only and never touch the store — that is what keeps them
reusable. Something that reads a file or runs a command goes in
`apps/admin-panel/api/<domain>/` as one `<action>.api.ts`, listed in `api/panel-api.ts`. `api/`
is a root of its own the same way: one folder per domain, `util/` for what the domains share,
and the contract and the service (`panel.ts`) at its root. The
window imports types and constants from `api/`, never a function — a value import would pull
Node into the window.

## Structure

```
services/ggg/          # @poe/ggg — the GGG trade API behind a rate limiter. Has a README.md
services/poe-watch/    # @poe/poe-watch — league price digests from api.poe.watch. Has a README.md
services/poe-ninja/    # @poe/poe-ninja — one league's market off poe.ninja. Has a README.md
services/repoe/        # @poe/repoe — the game's own item, gem, spectre and essence data. Has a README.md
services/taxonomy/     # @poe/taxonomy — one published version of the item taxonomy. Has a README.md
services/lake/         # @poe/lake — JSON files under .s3, addressed by key. Has a README.md
lib/filter-eval/       # @poe/filter-eval — parse and run a .filter. Depends on nothing. Has a README.md
lib/filter-compile/    # @poe/filter-compile — compose a row's conditions and write them as .filter lines
lib/item-parser/       # @poe/item-parser — one item's copied text, parsed and matched
lib/cache/             # @util/cache — cache-key, file-cache, sleep
lib/env/               # @util/env — requireEnv / optionalEnv. The only reader of process.env
apps/item-inspect/     # @poe/item-inspect — paste an item, see how the parser read it
apps/collector/        # README only. Replaces @poe/workers
apps/catalog/          # the bronze/silver/gold pipeline. Replaces @poe/filterv2. Has a README.md
apps/taxonomy/         # the hand-maintained classification table and the filter conditions. Has a README.md
apps/admin-panel/      # Electron + React panel over the taxonomy and the catalog. The one build. Has a README.md
packages/workers/      # DEPRECATED @poe/workers. Does not compile
packages/filterv2/     # DEPRECATED @poe/filterv2
.s3/                   # local stand-in for object storage. Gitignored. Holds the only copy of the taxonomy
data/sample-items/     # copied item text, the parser's fixtures. Two suites read this folder
data/                  # everything else here is scratch and gitignored
docs/                  # item-filter-syntax.md — the .filter grammar as GGG documents it
docs/plans/            # feature plans. Gitignored and never pushed
research/              # design notes, archived. Not a spec of what is built
queries.json           # hand-written trade searches. Belongs to the deprecated collector
influence-queries.json # generated, 2 MB, tracked. Belongs to the deprecated collector
README.md              # the product end to end: pipeline, catalog contract, generator status
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
| `@poe/ggg` | `@poe/ggg/service`, `/trade-url`, `/get-item-data.types`, `/get-stats.types`, `/search-listings.types`, `/fetch-listings.types`, `/fetch-currency-hour.types`, `/errors`, `/types` | The GGG trade API: every endpoint bound to one rate limiter the server's own headers keep updated. Owns every GGG URL, including `tradeSearchUrl`, the pure builder for the trade site page a person opens in a browser. See [services/ggg/README.md](services/ggg/README.md). |
| `@poe/poe-watch` | `@poe/poe-watch/service`, `/get-compact-data.types`, `/get-corruption-data.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | The PoeWatch price digests: one league's whole market per call, the corrupted-implicit outcomes per item, and the exchange book. A third party scraping trade listings, which is why a price from here is a listing rather than a sale. `/compact` needs `all=true` or it answers without a single crafting base. The catalog collects all three into bronze and prices silver off them: the exchange first, listings second, and a listing with `corruption` off one corruption outcome of a unique. `/corruptions?all=true` is the whole set, and asking per id adds nothing: it prices no outcomes for unique flasks, unique maps or most jewels. The admin panel downloads it at startup too, for its price picker. See [services/poe-watch/README.md](services/poe-watch/README.md). |
| `@poe/poe-ninja` | `@poe/poe-ninja/service`, `/get-leagues.types`, `/get-item-overview.types`, `/get-exchange-overview.types`, `/get-league-items.types`, `/get-exchange-ratios.types`, `/errors`, `/types` | poe.ninja's economy API, as a second opinion on the market PoeWatch scrapes. One league is 28 item calls plus 18 exchange calls — there is no whole-market endpoint. **Nothing imports it yet.** What a row *is* comes from the `type` that was asked for; `itemClass` is unusable and is read nowhere. See [services/poe-ninja/README.md](services/poe-ninja/README.md). |
| `@poe/lake` | `@poe/lake/service`, `/types` | JSON files under `.s3`, addressed by `/`-joined keys: read, write, atomic write, exists, list, clear. Every app and the taxonomy service store through it. It owns how bytes are stored and never where — each app keeps its own keys. See [services/lake/README.md](services/lake/README.md). |
| `@poe/taxonomy` | `@poe/taxonomy/service`, `/get-taxonomy.types`, `/get-categories.types`, `/errors`, `/types` | One published version of the item taxonomy, keyed by metadata id, and its category table, published as a separate file and read with `getCategories`. `latest` is a real copy of the promoted version. Read the categories by the rows' `version`, never `latest` twice. **A third party we happen to write ourselves** — `apps/taxonomy` publishes the versions and this reads one back, so the catalog treats it exactly like GGG or RePoE and knows nothing about how it was authored. Reads the published files straight off disk, under a `root` it is given (default `.s3`). Validates nothing. See [services/taxonomy/README.md](services/taxonomy/README.md). |
| `@poe/repoe` | `@poe/repoe/service`, `/get-base-items.types`, `/get-gems.types`, `/get-spectres.types`, `/get-essences.types`, `/get-cluster-jewels.types`, `/get-foulborn-map.types`, `/errors`, `/types` | RePoE's exports: the game's own data files, unpacked after each patch and served as static JSON off GitHub Pages. Carries no prices — this is what the game knows about an item, not what the market thinks of it. Six endpoints, each the whole file in one request with no query and no way to ask for less: `base_items.json`, `Gems.min.json`, `Spectres.json`, `Essence.min.json`, `cluster_jewels.json` — which pairs a cluster enchant's mod text with the passive name `EnchantmentPassiveNode` matches — and `ModFoulbornMap.json`, the only published list of which uniques drop foulborn. They share no vocabulary and nothing here reconciles them. Only two take the `.min` variant — `Spectres.min.json` is published empty, and `base_items.min.json` drops null keys rather than whitespace. `apps/taxonomy` seeds from it: `init` writes a row per base item and transfigured gem, and `seed` writes the gem and cluster-jewel variants. The deprecated `@poe/filterv2` imports it too. RePoE also publishes `uniques.json` — names and item classes, **no base** — which the service does not wrap; the taxonomy's unique rows were built from it, with each base taken from GGG's trade item list. `item_class` is GGG's internal name, not the `Class` a `.filter` matches on. See [services/repoe/README.md](services/repoe/README.md). |

## Libraries

Pure and imported. Anything here has to keep running when it is loaded somewhere with no
filesystem and no environment, because a desktop client is the plan.

| Library | Import as | Owns |
| --- | --- | --- |
| `@poe/filter-eval` | `@poe/filter-eval/parse-filter`, `/evaluate-filter`, `/filter-ast`, `/format-note` | The `.filter` grammar as code: a parser, an evaluator that decides which block takes an item, and the `#@` note a generated block carries its bucket in. **Depends on nothing, on purpose** — it is the independent reader that checks whatever wrote a filter, and sharing a types file with the writer would end that. See [lib/filter-eval/README.md](lib/filter-eval/README.md). |
| `@poe/filter-compile` | `@poe/filter-compile/compose`, `/fill-from`, `/condition-line`, `/resolve-row`, `/types` | The one copy of how a row's conditions resolve: category, subcategory, item and variant laid over each other, `from: "name"` and `from: "baseTypes"` filled off the row, and a resolved condition written as a `.filter` line from `@poe/filter-eval`'s registry. `apps/taxonomy` validates with it, so what it reports and what compiles cannot disagree. |
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

Four are written. `apps/collector` holds a `README.md`
naming what it will own, which POC it replaces, and what has to be decided first.

| App | Replaces | Owns |
| --- | --- | --- |
| [`apps/item-inspect`](apps/item-inspect/README.md) | — | **Written.** Paste an item copied out of the game, see how the parser read it. The one consumer of `@poe/item-parser` today, and where its CLI lives now that `lib/` is pure. |
| [`apps/collector`](apps/collector/README.md) | `@poe/workers` | The worker loop, the job handlers, the record of outstanding work, the writes into `.s3`, and `queries.json`. |
| [`apps/catalog`](apps/catalog/README.md) | `@poe/filterv2` | **Written.** The bronze/silver/gold pipeline over the taxonomy. **Its rows are the published taxonomy's drawable rows** — nothing `excluded`, nothing `filterable: false`, nothing an authored row replaces — and it invents or judges none. It collects PoeWatch and GGG's trade item list for one league-hour, writes a file per category, then gathers every row into `catalog.json` and `catalog.categories.json`. It carries the conditions the taxonomy authored and resolves none of them. It prices every row and variant off PoeWatch — the exchange first, listings second — and still hangs every unique off the base it rolls on under `uniques` — one group per path (`unique`, `unique/foulborn`), one listing per priced form inside it. The taxonomy now also authors one row per unique base (`unique/regular`, `unique/foulborn`, `unique/fragments`), which the catalog prices like any row, so a unique is priced in both places; which one a generator reads is undecided. `--force=taxonomy,poewatch` refetches only the named sources. `catalog:publish` copies one run's gold into `catalog/latest/`, and a run's manifest records the taxonomy version it used. Also `find-duplicates-cli.ts`, which reports the display names more than one metadata id carries. |
| [`apps/taxonomy`](apps/taxonomy/README.md) | — | **Written.** The hand-maintained tables: six JSON files per version under `.s3/taxonomy/versions/<v>/`, never in git. A version is `3.29.4` — created from a published parent, never overwritten, and only the newest can be published, while it is still a draft. `validate` and `resolve` answer in JSON for the admin panel. Nothing imports it — the catalog reads what it published through `@poe/taxonomy`. |
| [`apps/admin-panel`](apps/admin-panel/README.md) | — | **Written.** The desktop panel: browse and edit the newest draft, validate, publish, build and publish a catalog. Every call is an `.api.ts` adapter that reads the lake or runs a yarn command. Imports no other app. |

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

All of it is gitignored. **Not all of it is re-fetchable.** `.s3/taxonomy/` holds every
taxonomy version, and it is the only copy — the version files left git so a copy per version
would not grow the repository forever. Back it up; nothing else does.

```
.s3/taxonomy/registry.json          which versions exist, and which are published
.s3/taxonomy/versions/<v>/*.json    the six files one version is edited as
.s3/taxonomy/<v>.json               one published version's rows, merged
.s3/taxonomy/<v>.categories.json    the same version's category table
.s3/taxonomy/latest/taxonomy.json   the promoted rows, a real copy
.s3/taxonomy/latest/categories.json the promoted categories, a real copy
.s3/catalog/run=<id>/               one run's bronze, silver, gold and manifest
.s3/catalog/latest/<league>.*.json  the published catalog, a real copy
```

`apps/taxonomy`, `apps/catalog` and `apps/admin-panel` write here through `@poe/lake`, and
agree on the key layout by convention. `apps/collector` is not built. The deprecated `@poe/workers` still carries
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

## Conventions

- **No comments.** Only a real gotcha gets one, and it stays under five words.
- **An endpoint's `.types.ts` is its contract**: the shape it answers with, and nothing else.
  Every building block that shape is made of goes in the service's `types.ts`.
- **A service does its own reading.** No injected store or adapter interface when there is
  one implementation — an abstraction with one user is lines that do nothing.
- **One function per file, unless it is a thin wrapper.** In the renderer that means one
  component per file, and every utility function in a file of its own.
- **Components get semantic names**: the name says what the thing does — `ItemEditor`, not
  `Detail`. A reader should know what a component is for without opening it.
- **No chained ternaries.** One `? :` is fine. A second one in the same expression becomes a
  function with an early return per case.
- **One branch per case, read top to bottom.** Each input shape gets one early return, and a
  case that needs more than a line gets its own function. Do not compute flags up front only
  to cross-check them.

## Toolchain rules

Node 26 strips types to run `.ts`; `tsc` only type-checks (`noEmit`). Enforced by
`erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties.
- Relative imports keep the extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

One root `tsconfig.json` (`include: ["apps/**/*.ts", "lib/**/*.ts", "services/**/*.ts"]`)
checks every live package across boundaries. No project references, no per-package configs.

**`apps/admin-panel` is the one exception.** It is built by electron-vite, has JSX, and checks
itself with its own `tsconfig.json`; the root one excludes it. Run
`yarn workspace @poe/admin-panel typecheck` for it. Its tests are plain `.ts` and run under
the root jest like everything else.

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
| `POE_USER_AGENT` | `user-agent` sent on every outbound request. Must name the app and a real contact address. No service reads it — they take `userAgent` as an option, and GGG refuses to default it, because a default would send a contact that does not exist | [apps/item-inspect/item-cli.ts](apps/item-inspect/item-cli.ts), [apps/catalog/catalog-cli.ts](apps/catalog/catalog-cli.ts), [apps/admin-panel/main.ts](apps/admin-panel/main.ts) (optional there, from `apps/admin-panel/.env`), and the deprecated `@poe/filterv2` |
That is the whole live surface: **one variable**. `apps/taxonomy`
reads none — it only ever touches files under the lake. Every other name still read anywhere
in the tree belongs to `packages/workers`, which does not compile, and its `.env` names
things whose packages were deleted.

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

Open the admin panel:

```bash
yarn admin
```

Start a draft from a published taxonomy version, then publish it and make it current:

```bash
yarn taxonomy:create --parent=3.29.3
```

```bash
yarn taxonomy:publish 3.29.4
```

```bash
yarn taxonomy:promote 3.29.4
```

Collect and build one league-hour, then report the names more than one id carries. A run
that already has bronze reuses it and rebuilds silver and gold. `--force` collects bronze
again — bare for every source, or named for some. `--force=taxonomy` is how a newly promoted
taxonomy reaches a run that was already collected:

```bash
yarn catalog --league=Allflame --hour=1788292800
```

```bash
yarn catalog --league=Allflame --hour=1788292800 --force=taxonomy
```

Make one run the league's published catalog:

```bash
yarn catalog:publish --league=Allflame --hour=1788292800
```

```bash
yarn duplicates --league=Allflame --hour=1788292800
```

## Docs

[README.md](README.md) at the root describes the product, for whoever builds the next part.
Package READMEs describe their own package.

Every service has a `README.md`; `services/ggg` also has Mermaid `.mmd` diagrams in
`services/ggg/docs/`. `lib/filter-eval` has a `README.md`.

`lib/filter-compile`, `lib/item-parser`, `lib/cache` and `lib/env` have none. Write one with the `/document`
command.

`apps/item-inspect`, `apps/taxonomy` and `apps/collector` have a `README.md`. The taxonomy's
is where the condition language lives: the shape of a condition, how the four levels compose,
and what the validator refuses. `apps/catalog` and `apps/admin-panel` have one too; the catalog's
pipeline shape is in the step files' doc comments.

`apps/collector` has a `README.md` describing what does not exist yet. Each folder
under `packages/` has a `DEPRECATED.md`.

[docs/item-filter-syntax.md](docs/item-filter-syntax.md) is how filters work in PoE: the
`.filter` grammar as GGG documents it — `Show`/`Hide`/`Minimal` blocks, `Continue`,
`Import`, the operators, every condition and every action. Anything a generated filter holds has
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
