# poe-stuff

Yarn 4 workspace monorepo of TypeScript packages for Path of Exile item filters. Node runs
the `.ts` files directly, so no package needs a build step. This is a fact about Node 26,
not a rule against building.

## Purpose

The product is a `.filter` file: given every item the game can show and what each one is
worth, decide how loudly to draw it.

Two halves feed that. The first makes rate-limited requests to GGG without earning a ban —
`@poe/ggg` paces every request behind a limiter the server's own headers keep updated. The
second reads the filter language: `@poe/item-parser` turns one item's copied text into a
shape the language can be asked about, and `@poe/filter-eval` parses a `.filter` and decides
which block takes an item.

**Nothing writes the styled `.filter` yet.** The generator and the
generator's model `@poe/filter-style` were deleted, and the admin panel is being rebuilt. A replacement starts from `catalog.json`.
`yarn catalog:compile` writes an unstyled `.filter`, one `Show` block per row or variant, so
the game client can say which condition lines it rejects. It checks the taxonomy and is not
the product.

[README.md](README.md) describes the product end to end: the pipeline from taxonomy to
`.filter`, the catalog's row contract, and what the generator has and has not decided.

## Tiers

Code is split by **where it runs**, not by what it is about. This is the rule for where new
code goes:

| Tier                | Runs where                                 | Rule                                                                                                                                              |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/`         | backend                                    | One outside API, one object. Reads no environment.                                                                                                |
| `lib/`              | anywhere — node today, a desktop app later | Pure. Imported, never runs on its own. No `process.env`, no database client, no cloud SDK.                                                        |
| `apps/`             | backend                                    | Has a `main()`. Owns its `.env`. Never imported by anything.                                                                                      |

An app has a CLI and reads the environment; a lib has neither. If a new file needs
`requireEnv`, it belongs in an app.

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
lib/filter-validate/   # @poe/filter-validate — sample items off the taxonomy, and what a filter misses
lib/item-parser/       # @poe/item-parser — one item's copied text, parsed and matched
lib/diff-summary/      # @util/diff-summary — what one agent step changed, as plain lines for the Judge
lib/panel-state/       # @poe/panel-state — the keyed categories/seeders/items state and its commands
lib/cache/             # @util/cache — build-cache-key, create-file-cache, sleep
lib/env/               # @util/env — requireEnv / optionalEnv. The only reader of process.env
apps/catalog/          # the bronze/silver/gold pipeline. Replaces the deleted @poe/filterv2. Has a README.md
apps/taxonomy/         # the hand-maintained classification table and the filter conditions. Has a README.md
apps/agent-training/   # goals built off the promoted panel state, cut into Router/Filler/Judge rows; trainers (train/, Python in Podman) and the scorer
.s3/                   # local stand-in for object storage. Gitignored. Holds the only copy of the taxonomy
data/sample-items/     # copied item text, the parser's fixtures. Two suites read this folder
data/                  # everything else here is scratch and gitignored
docs/                  # item-filter-syntax.md — the .filter grammar as GGG documents it
docs/plans/            # feature plans. Gitignored and never pushed
research/              # design notes, archived. Not a spec of what is built
README.md              # the product end to end: pipeline, catalog contract, generator status
techdebt.md            # what the repo knowingly duplicates and does not do yet
tsconfig.json          # one config. Type-checks apps, lib and services
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

| Service          | Import as                                                                                                                                                                                                      | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@poe/ggg`       | `@poe/ggg/service`, `/trade-url`, `/get-item-data.types`, `/get-stats.types`, `/search-listings.types`, `/fetch-listings.types`, `/fetch-currency-hour.types`, `/errors`, `/types`                             | The GGG trade API: every endpoint bound to one rate limiter the server's own headers keep updated. Owns every GGG URL, including `tradeSearchUrl`, the pure builder for the trade site page a person opens in a browser. See [services/ggg/README.md](services/ggg/README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@poe/poe-watch` | `@poe/poe-watch/service`, `/get-compact-data.types`, `/get-corruption-data.types`, `/get-exchange-ratios.types`, `/errors`, `/types`                                                                           | The PoeWatch price digests: one league's whole market per call, the corrupted-implicit outcomes per item, and the exchange book. A third party scraping trade listings, which is why a price from here is a listing rather than a sale. `/compact` needs `all=true` or it answers without a single crafting base. The catalog collects all three into bronze and prices silver off them: the exchange first, listings second, and a listing with `corruption` off one corruption outcome of a unique. `/corruptions?all=true` is the whole set, and asking per id adds nothing: it prices no outcomes for unique flasks, unique maps or most jewels. The admin panel downloads it at startup too, for its price picker. See [services/poe-watch/README.md](services/poe-watch/README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@poe/poe-ninja` | `@poe/poe-ninja/service`, `/get-leagues.types`, `/get-item-overview.types`, `/get-exchange-overview.types`, `/get-league-items.types`, `/get-exchange-ratios.types`, `/errors`, `/types`                       | poe.ninja's economy API, as a second opinion on the market PoeWatch scrapes. One league is 28 item calls plus 18 exchange calls — there is no whole-market endpoint. **Nothing imports it yet.** What a row _is_ comes from the `type` that was asked for; `itemClass` is unusable and is read nowhere. See [services/poe-ninja/README.md](services/poe-ninja/README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `@poe/lake`      | `@poe/lake/service`, `/types`                                                                                                                                                                                  | JSON files under `.s3`, addressed by `/`-joined keys: read, write, atomic write, JSONL write, exists, list, clear. Every app and the taxonomy service store through it. It owns how bytes are stored and never where — each app keeps its own keys. See [services/lake/README.md](services/lake/README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `@poe/taxonomy`  | `@poe/taxonomy/service`, `/get-taxonomy.types`, `/get-categories.types`, `/errors`, `/types`                                                                                                                   | **Deprecated: the old taxonomy (metadata ids, subcategories), being rebuilt.** One published version of the item taxonomy, keyed by metadata id, and its category table, published as a separate file and read with `getCategories`. `latest` is a real copy of the promoted version. Read the categories by the rows' `version`, never `latest` twice. **A third party we happen to write ourselves** — `apps/taxonomy` publishes the versions and this reads one back, so the catalog treats it exactly like GGG or RePoE and knows nothing about how it was authored. Reads the published files straight off disk, under a `root` it is given (default `.s3`). Validates nothing. See [services/taxonomy/README.md](services/taxonomy/README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `@poe/repoe`     | `@poe/repoe/service`, `/get-base-items.types`, `/get-gems.types`, `/get-spectres.types`, `/get-essences.types`, `/get-cluster-jewels.types`, `/get-foulborn-map.types`, `/get-mods.types`, `/errors`, `/types` | RePoE's exports: the game's own data files, unpacked after each patch and served as static JSON off GitHub Pages. Carries no prices — this is what the game knows about an item, not what the market thinks of it. Seven endpoints, each the whole file in one request with no query and no way to ask for less: `base_items.json`, `Gems.min.json`, `Spectres.json`, `Essence.min.json`, `cluster_jewels.json` — which pairs a cluster enchant's mod text with the passive name `EnchantmentPassiveNode` matches — and `ModFoulbornMap.json`, the only published list of which uniques drop foulborn — and `mods.json`, every mod with its minimum item level and the base tags it rolls on. They share no vocabulary and nothing here reconciles them. Only two take the `.min` variant — `Spectres.min.json` is published empty, and `base_items.min.json` drops null keys rather than whitespace. `apps/taxonomy` seeds from it: `init` writes a row per base item and transfigured gem, and `seed` writes the gem and cluster-jewel variants. RePoE also publishes `uniques.json` — names and item classes, **no base** — which the service does not wrap; the taxonomy's unique rows were built from it, with each base taken from GGG's trade item list. `item_class` is GGG's internal name, not the `Class` a `.filter` matches on. See [services/repoe/README.md](services/repoe/README.md). |

## Libraries

Pure and imported. Anything here has to keep running when it is loaded somewhere with no
filesystem and no environment, because a desktop client is the plan.

| Library                | Import as                                                                                                                                                                          | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@poe/filter-eval`     | `@poe/filter-eval/parse-filter`, `/evaluate-filter`, `/match-filter`, `/filter-ast`, `/format-note`                                                                                | The `.filter` grammar as code: a parser, an evaluator that decides which block takes an item, and the `#@` note a generated block carries its bucket in. `buildFilterMatcher` answers the same question for bulk runs: it indexes the blocks once by `BaseType ==`, so a million items cost seconds rather than hours. `buildEveryMatchMatcher` does the same but keeps every matching block past the winner. **Depends on nothing, on purpose** — it is the independent reader that checks whatever wrote a filter, and sharing a types file with the writer would end that. See [lib/filter-eval/README.md](lib/filter-eval/README.md).                                                                                                                                                                                                                                         |
| `@poe/filter-compile`  | `@poe/filter-compile/compose-layers`, `/fill-from-row`, `/write-condition-line`, `/resolve-row`, `/write-unstyled-filter`, `/owner-note`, `/types`                                                         | The one copy of how a row's conditions resolve: category, subcategory, item and variant laid over each other, `from: "name"` and `from: "baseTypes"` filled off the row, and a resolved condition written as a `.filter` line from `@poe/filter-eval`'s registry. `writeUnstyledFilter` writes the unstyled `.filter`, one block per row or variant with its key in the note, with each category's subcategories in their `order` and a `catchAll` one last; `catalog:compile`, `catalog:validate` and the taxonomy's eval cases all use it. `apps/taxonomy` validates with it, so what it reports and what compiles cannot disagree. `writeOwnerNote` and `readOwnerNote` are the one writer and reader of a block's `<key> <variant>` note; keys may hold spaces, so the reader takes the longest known key.                                                                                        |
| `@poe/filter-validate` | `@poe/filter-validate/build-samples`, `/format-path`, `/check-filter`, `/find-unfiltered`, `/find-fall-through`, `/group-unfiltered`, `/describe-sample`, `/sample-query`, `/report-csv`, `/types` | The filter validator, run by `yarn catalog:validate`. `buildSamples` yields, one at a time, the sample items a subcategory's `samples` sets build for every catalog row, plus its `rejects` laid over each, deduplicated per row so two rows building one item both show it. A top-level category holds no samples, and a sample set naming an unknown condition or a literal value that cannot fit it throws. `checkFilter` walks them once through `@poe/filter-eval`'s `buildEveryMatchMatcher` and returns both reports; `findUnfiltered` and `findFallThrough` return one half each. Unfiltered is the samples no block takes, grouped by row, plus the paths that have no sets. Fall-through is samples its own path misses, another path wins, another path also matches, or a reject sample its own path takes; a `catchAll` category may overlap its siblings. What to sample lives in the taxonomy, never here. |
| `@poe/item-parser`     | `@poe/item-parser/parse-item`, `/resolve-item`, `/to-filter-item`, `/match-mods`, `/mod-text`, `/parse-header`, `/parse-mods`, `/parse-properties`, `/sections`, `/types`          | One item's copied text, read back. `parseItem` is pure and needs nothing; `resolveItem` looks each modifier up in GGG's published stat list to get the ids the trade site knows it by; `toFilterItem` turns the result into the shape `@poe/filter-eval` asks conditions about. Nothing about any modifier is written down — matching is against published text, so a modifier that ships next league matches the day it appears.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `@util/diff-summary`   | `@util/diff-summary/summarize-diff`, `/types` | What one agent step changed, as a few plain lines the Judge reads instead of raw state. `summarizeDiff({ start, before, after }, config)` diffs with `microdiff` and groups bulk edits with coverage, such as `24/25 seeders in Bases: tag chase added (not: Amulets)`. It pairs renames by identical contents and moves by unique name, and flags a change that undoes an earlier step of the same request. The state must be keyed maps all the way down, with no arrays: a bag is `{ value: true }`, and an empty bag is deleted. The only project input is a label per path level, plus optional names for value sets. Generic, with nothing about PoE in it. |
| `@poe/panel-state`     | `@poe/panel-state/types`, `/load-state`, `/check-state`, `/execute-command`, `/resolve-name`, `/value-sets`, `/summary-config` | The agent's state and the commands that edit it, built for `@util/diff-summary`. Categories, seeders and items are maps keyed by name. A bag is `{ value: true }` and is never stored empty, and seeder names are unique across categories. `checkState` lists every break of that contract. `loadState` reads a version's `categories.json` and gives every known item an empty entry. `executeCommand(state, command)` is pure and throws when a command names something missing. Lookups of existing names go through `resolveName`, a runtime safety net for typos: exact, then ignoring case, then the closest name within 1 edit (names up to 7 letters) or 2 (longer), and a tie matches nothing. New names (create, rename `to`) are taken as written. Training data never carries misspelt names. There are nine commands, one per action: `createCategory`, `rename`, `deleteCategory`, `mergeCategory`, `createSeeder`, `updateSeeders`, `moveSeeders`, `deleteSeeders` and `updateItems`. Bulk targets are `categories` + `seeders` − `except`. A condition value is a set name from `VALUE_SETS` or a literal list, and `null` in a removal drops the whole condition. `SUMMARY_CONFIG` is the one summary config the runtime and the training generator share. The old admin panel's commands in `apps/admin-panel/commands/` are deprecated and unaffected. |
| `@util/cache`          | `@util/cache/build-cache-key`, `/create-file-cache`, `/sleep`                                                                                                                       | `buildCacheKey` for stable file and map keys. `createFileCache<T>` — JSON on disk, one file per key, backing every service's response cache. `sleep` is a promise around `setTimeout`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `@util/env`            | `@util/env`                                                                                                                                                                        | `requireEnv` / `optionalEnv` — the only place `process.env` is read, so a missing variable fails with one message that names it. **The exception to the purity rule, and app-only**: no other library may import it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Nothing in `lib/` imports a service

Not even for a type. `@poe/item-parser` needs GGG's published stat list, and declares the
shape it needs itself — `PublishedStat` in [lib/item-parser/types.ts](lib/item-parser/types.ts).
`createGGGService(…).getStats()` answers with exactly that shape, so a caller passes it
straight in and no adapter exists anywhere.

That is the rule and not an accident of this one case: a library is handed its input and
never learns where the input came from. The moment a lib names a service in its
`dependencies`, it stops being loadable anywhere the service is not.

## Apps

Two are written, and `apps/admin-panel` is being rebuilt: an Electron window over the
categories and seeders `yarn admin-panel:migrate` writes to `.s3/admin-panel/versions/`.
`yarn admin-panel` opens the newest version. A seeder is edited in the seeders view's third column; Save overwrites
that version when it is a draft, and writes a new draft from it when it is published. Every
seeder edit is a log entry; Save appends them to the version's `wal.json` before its
`categories.json`. Undo appends the inverse entry, never removes one. It has its own `tsconfig.json`, which
`yarn typecheck` runs after the root one.

The omni bar takes agent instructions, not searches: Tab completes a known name, Enter asks
the agent for a plan. A picker in the bar lists every trained version under `.s3/training/`,
newest first; the picked one loads on its first plan, on the GPU, replacing the one loaded before. Applied filters show as chips below the bar; item search lives in the items
view, and a seeder filter is toggled from its row. `yarn admin-panel:feedback-to-rows` turns
the kept interactions into training rows under `.s3/training/feedback/training-data/`. The
models are trained by `apps/agent-training`.

| App                                                | Replaces                 | Owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/catalog`](apps/catalog/README.md)           | `@poe/filterv2`, deleted | **Written.** The bronze/silver/gold pipeline over the taxonomy. **Its rows are the published taxonomy's drawable rows** — nothing `excluded`, nothing `quest`, nothing `filterable: false`, nothing an authored row replaces — and it invents or judges none. It collects PoeWatch and GGG's trade item list for one league-hour, writes a file per category, then gathers every row into `catalog.json` and `catalog.categories.json`. It carries the conditions the taxonomy authored and resolves none of them. It prices every row and variant off PoeWatch — the exchange first, listings second — and still hangs every unique off the base it rolls on under `uniques` — one group per path (`unique`, `unique/foulborn`), one listing per priced form inside it. The taxonomy now also authors one row per unique base (`unique/regular`, `unique/foulborn`, `unique/fragments`), which the catalog prices like any row, so a unique is priced in both places; which one a generator reads is undecided. `--force=taxonomy,poewatch` refetches only the named sources. `catalog:publish` copies one run's gold into `catalog/latest/`, and a run's manifest records the taxonomy version it used. Also `find-duplicates-cli.ts`, which reports the display names more than one metadata id carries. |
| [`apps/taxonomy`](apps/taxonomy/README.md)         | —                        | **Deprecated: the old taxonomy (metadata ids, subcategories), being rebuilt.** **Written.** The hand-maintained tables: six JSON files per version under `.s3/taxonomy/versions/<v>/`, never in git. A version is `3.29.4` — created from a published parent, never overwritten, and only the newest can be published, while it is still a draft. `validate` and `resolve` answer in JSON. Nothing imports it — the catalog reads what it published through `@poe/taxonomy`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Every app is driven by commands

This is the rule for every app written from now on, so an agent can drive an app the same way a
person does. `apps/catalog` and `apps/taxonomy` predate it and are exempt.

- **Commands are the tools an agent can call.** Each one changes shared state, such as the
  data or the disk. Commands are plain, serializable objects with one `type` each, and the UI
  never edits shared state itself.
- **Commands name things in plain fields.** A command takes `category` and `seeder`, never a
  joined key. An update sends only what changes: `add` and `remove` lists merged into what is
  stored. A replace sends the whole thing.
- **UI state is never a command.** Picks, search, view, selection and dialogs stay local to
  the UI. No agent ever opens or closes anything on screen.
- **One pure executor.** `executeCommand(state, command, stamp)` returns the new state. Disk
  commands, such as save, are the only ones the dispatcher runs itself. Reading state, such
  as load, is a plain call and not a command.
- **One dispatcher, in the process that owns the state.** The UI and agents send commands to
  the same place.
- **Agents only propose.** The agent runs on a copy of the state and returns a plan. Nothing
  reaches the real state until the user approves the plan in a modal; the approved steps are
  dispatched like any other command. Commands are not signed in this phase.
- **Every reviewed agent plan is kept.** Accept (as proposed or edited) or Reject writes the
  plan, the final steps and the reviewer's notes to `.s3/admin-panel/agent-feedback/`, for
  training. Dismiss closes the plan and keeps nothing.

The admin panel is the reference implementation. Each command is two files in `commands/`:

- `<name>.ts` holds the command's type and its `execute`.
- `<name>.renderer.tsx` holds the React view the approval modal shows.

`commands.ts` holds the union and the executor map. `renderer/command-views.ts` holds the view
map. Both maps are typed over every command type, so a command missing either half fails
typecheck.

## Deleted

`packages/` is gone. It held two proofs of concept — `@poe/workers`, the collector, and
`@poe/filterv2`, the item-list build — that nothing imported and neither typecheck nor jest
read. Their design notes went with them: read `docs/pipeline.md` and `filterv2/notes.md` out
of git history before rewriting either. `apps/catalog` replaces `@poe/filterv2`.

`apps/generator`, `lib/filter-style`, `apps/item-inspect` and
`apps/collector` are gone too. The branch `backup/pre-cleanup` holds their last state.

## Storage

**S3 is the local disk at `./.s3`.** No object-storage service to run, no credentials, no
client library — everything is a file, which means a page can be opened in an editor while
a run is going.

```
.s3/            what the collector writes: one file per page, per collected hour
.s3/.cache/     cached responses, one file per request
```

All of it is gitignored. **Not all of it is re-fetchable.** **Deprecated: the old taxonomy (metadata ids, subcategories), being rebuilt.** `.s3/taxonomy/` holds every
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

`apps/taxonomy` and `apps/catalog` write here through `@poe/lake`, and
agree on the key layout by convention. Nothing in the tree
carries an S3 client any more: `@aws-sdk/client-s3` left with `@poe/workers`, which wrote to
a real bucket named by `S3_URL` and `S3_BUCKET`.

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

**Apps may nest deeper.** An app is close to a project root of its own, so a feature folder
inside an app can hold subfolders when it outgrows one level, as
`apps/admin-panel/generate-training/` does with `goals/`, `rows/` and `fake-panel/`. Libraries
and services stay at one level.

**One function per file is a rule of thumb, not a law: split when a test against that
function would be meaningful.** A parser, a fetch, a decision — each earns its own file. A
semantic wrapper over one `map`, `filter` or `Set` round-trip does not, and stays inline
where it is used.

A CLI is `{feature}-cli.ts` at the package root, and belongs to an app. Anything another
package imports needs a line in the `exports` map of its `package.json`; a file under
`{feature}/` is private by not being listed. Inside a package, imports stay relative and
keep `.ts`.

## Conventions

- **No comments.** Only a real gotcha gets one, and it stays under five words. A dense function may carry an `@example`.
- **An endpoint's `.types.ts` is its contract**: the shape it answers with, and nothing else.
  Every building block that shape is made of goes in the service's `types.ts`.
- **A service does its own reading.** No injected store or adapter interface when there is
  one implementation — an abstraction with one user is lines that do nothing.
- **One function per file, unless it is a thin wrapper.** In the renderer that means one
  component per file, and every utility function in a file of its own.
- **Names are declarative, not semantic**: a name states plainly what the thing is or
  holds, not the role it plays. `knownItems`, not `candidates` or `members`.
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

| Var              | Holds                                                                                                                                                                                                                                          | Read by                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POE_USER_AGENT` | `user-agent` sent on every outbound request. Must name the app and a real contact address. No service reads it — they take `userAgent` as an option, and GGG refuses to default it, because a default would send a contact that does not exist | [apps/catalog/catalog-cli.ts](apps/catalog/catalog-cli.ts) |

That is the whole surface: **one variable**. `apps/taxonomy` reads
none — it only ever touches files under the lake. Nothing else in the tree reads the
environment at all, now that `@poe/workers` and its Redis, Postgres and S3 names are gone.

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

Build a sample of every agent training goal kind off the promoted panel state, and write it to
`.s3/agent-training/goals-review.md` for review. Each goal is a request plus the commands that
fulfil it, checked against the real executor. `--per-kind` and `--seed` default to 3 and 1:

```bash
yarn agent:goals --per-kind=3
```

Cut the goals into training rows: `router.jsonl`, `filler.jsonl` and `judge.jsonl` under
`.s3/agent-training/<name>/`, plus `rows-review.md`, which holds the first goal of each kind with
every row cut from it. `--per-kind` defaults to 50. One request in four carries typos, in template
words only. `--split=train` drops goals whose template (1 in 5) or seeder name (1 in 10) is held
out; `--split=eval` writes `seen/` and `held-out/` sets, meant for a different `--seed`:

```bash
yarn agent:rows --name=train-1 --split=train --seed=1
```

```bash
yarn agent:rows --name=eval-1 --split=eval --seed=2
```

Train the Router and Judge (ettin-encoder-150m, full fine-tune, class-weighted, early stopping on
validation macro-F1) and the Filler (Qwen3-0.6B, Unsloth LoRA, loss on the answer only) in the
`localhost/poe-training` Podman image, then predict every set given. The Filler decodes with beam
search and keeps the first candidate whose condition names and value sets exist and whose names,
tags and values appear in its input (generate-and-verify). `ONLY=router|judge|filler` trains one:

```bash
bash apps/agent-training/train.sh run-1 train-1 val-1/seen eval-1/seen eval-1/held-out
```

Score a run: accuracy, macro-F1 and per-label recall for the Router and Judge, caught rejects per
mutation kind, and execution match for the Filler, which runs each predicted command through the real
executor on its step's state. Writes `.s3/agent-training/runs/<run>/report.md`:

```bash
yarn agent:score --run=run-1
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

`lib/filter-compile`, `lib/filter-validate`, `lib/item-parser`, `lib/diff-summary`, `lib/panel-state`, `lib/cache` and `lib/env` have none. Write one with the `/document`
command.

`apps/taxonomy` has a `README.md`. It is where the condition language lives: the shape of a
condition, how the four levels compose, and what the validator refuses. `apps/catalog` has one
too; its pipeline shape is in the step files' doc comments.

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

## Working rules

### Scope

Do exactly what was asked. Nothing more.

- No unrequested refactors, renames, cleanups, extra files, tests, docs, error handling,
  config or dependencies.
- "Fix this function" means that function. Not the file, not the pattern elsewhere.
- Spot something worth doing? Name it in one line and stop.
- Ambiguous scope: ask before acting.
- Finish what was asked completely. Narrow scope, full depth.

### Plan first

Outline every feature before writing it, and wait for a yes. Reading and searching to build
the plan is fine; edits are not.

- Group the plan by need. Each group opens with one bold line: what is needed, why, and what
  is missing now. Then one bullet per change, naming the file it touches.
- Cap it at 7 steps. Longer means split into stages and plan stage one only.
- Over 7 steps, over 5 files, or any schema/migration/delete: write `docs/plans/<feature>.md`.
- Every assumption becomes a question before acting.

Small and obvious — one file, one function, a typo, a named rename — skip the plan.

### After a feature

End with a flow summary: where the data enters, one line per hop (file, and what changes
there), where it lands. Then say what changes visibly and how to check it.

### Tools

Write and edit files with the Write and Edit tools. **Never use a shell heredoc**, `printf`,
`sed` or a `node -e` script to author file content. Bash is for running things: git, tests,
builds, greps.

### Code

**A function never changes its parameters.** It reads them and returns something new.

- No writing into an array, object, `Map` or `Set` the caller passed in.
- A pipeline step returns the next value. It never takes an accumulator as an argument.
- State the function created itself may be mutated freely.
- A name starting with `add`, `apply`, `enrich` or `fill` that returns `void` is the smell.

No counted-from-a-snapshot numbers in comments, docs or diagrams ("84 tests", "8 MB"). Keep a
number only when it is fixed and load-bearing, such as a limit set in the code.
