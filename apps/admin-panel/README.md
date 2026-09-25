# @poe/admin-panel

The desktop panel for the taxonomy and the catalog. Electron, with a React window.

## Purpose

One place to do a patch's work: file items into categories, split them into priced variants,
author the rows no source has, validate, publish a taxonomy version, then build and publish a
catalog against it. The spec is [admin-panel.md](admin-panel.md), the look is
[styling.md](styling.md), and [mockup.html](mockup.html) is the target screen.

It imports no other app. It reads the lake and runs the other apps' yarn commands, the same
way it will call their APIs once they have some.

## Structure

```
apps/admin-panel/
├── main.ts                 # Electron main: binds every adapter to IPC, opens the window
├── preload.ts              # exposes one IPC call per adapter as window.panel
├── api/                    # the adapters — the contracts. A root of its own, one folder per domain
│   ├── panel-api.ts        # PanelApi: every call the window can make. Types and constants only
│   ├── panel.ts            # binds each adapter to the repo
│   ├── <domain>/<action>.api.ts
│   ├── taxonomy/types.ts   # the six files as apps/taxonomy writes them, and the panel's words for them
│   ├── ledger/types.ts     # one saved unit of edits, and the ledger they make
│   └── util/               # what the domains share
│       ├── assert-editable.ts # refuses a write to anything but the newest draft
│       ├── keys.ts         # the lake layout, the only place the panel names a path
│       ├── lake.ts         # reads and writes under .s3
│       └── yarn.ts         # runs a yarn command
├── renderer/               # the React window
└── electron.vite.config.ts
```

## The adapter rule

Every call the window makes is one `.api.ts`. It names the data model — what the file or the
command holds — and the domain model the window works in, and maps one to the other.

- **Data calls** read and write the lake directly (`getVersions`, `getVersion`, `saveDraft`,
  `getRuns`, the ledger calls), or parse JSON off a command's stdout (`validate`).
- **Actions** run a yarn command, and the exit code is the whole answer (`createVersion`,
  `publishVersion`, `promoteVersion`, `buildCatalog`, `publishCatalog`). Their output is shown
  to a person and never parsed.

**The window never learns where anything is stored.** No adapter hands it a path or a file
name, and it imports only types and constants from `api/`. Moving to the cloud swaps what the
adapters do and touches nothing in `renderer/`.

## What it does

- **Edits only the newest draft.** Anything else opens read-only. A save writes the rows that
  changed into the four hand-edited files. It never writes the two `.seeded` files.
- **An edited seeded list or row is copied into the hand-written file**, which then replaces
  the seeded one whole.
- **Everything works off the working version**: the draft's files, the ledger replayed, and
  the unsaved edits on top. "This item matches", "This variant matches" and the category
  preview are worked out in the window with `@poe/filter-compile`, the same resolver the
  taxonomy validates with and the catalog compiles with, so they follow every edit at once.
  Validate and Compile stage the working version in a throwaway lake and run there.
- **A category or subcategory is renamed by editing its slug.** The rename is one ledger
  entry: the record, its subcategories and every row filed there move to the new path, and the
  old paths are deleted. Changing a subcategory's parent and slug together saves two entries,
  a move then a rename, and undo reverts one at a time.
- **Publish validates, publishes and promotes**, in that order, after a confirm.
- **Compile filter is temporary.** It stages the working version in a throwaway lake, publishes
  the copy there, and runs `yarn catalog:compile` against it. The result
  lands in `Documents/My Games/Path of Exile/taxonomy-compiled.filter`, so the game client can
  say which lines it rejects. The real lake is only read.
- **Validate filter checks what the compiled filter misses.** It stages the working version the
  same way and runs `yarn catalog:validate`. That command builds sample items from the
  categories' `samples` sets and runs them through the compiled filter. A modal lists every
  sample no block takes, grouped by category path and row. **Open** jumps to the row, and
  **Save CSV** writes the report to a path you pick. A path with no sample sets is named, not
  sampled.
- **One league, Allflame. One catalog build at a time**, because GGG counts requests per IP.
- **The category list has three tabs**: Included, Excluded, and Untouched. Untouched is the
  work nobody has started: a row that is not excluded, quest or unpriceable, with no listing
  on the row or on any variant. One rule, `row-in-view.ts`, decides all three, so the tree,
  the list and the counts agree.

## Gotchas

- **PoeWatch's names download when the panel opens**, behind the progress screen, through
  `@poe/poe-watch` with the same hourly file cache under `.s3/.cache` every service uses: the
  listings, the exchange and the corruption outcomes. Each outcome is its own "Listed as"
  option, `Headhunter · corrupted: …`, linking `{ name, corruption }`. The first open in an
  hour downloads tens of megabytes; later ones read from disk. A failed download leaves
  "Listed as" typed by hand. `POE_USER_AGENT` in `apps/admin-panel/.env` is optional and
  overrides PoeWatch's default user agent.
- **yarn needs a shell on Windows.** An argument holding `"`, `%`, `$` or a backtick is refused
  rather than passed through, since the shell would expand it.
- **The repo is found two folders above the app.** A packaged build has no repo there and will
  not work. Run it from the checkout.
- **The preload is CommonJS**, because a sandboxed preload cannot be an ES module.

## Environment

None of its own. `buildCatalog` runs `yarn catalog`, which loads `apps/catalog/.env`.

## How to run

From the repo root, with hot reload:

```bash
yarn admin
```

Type-check it — the root `yarn typecheck` does not cover it:

```bash
yarn workspace @poe/admin-panel typecheck
```

Build it:

```bash
yarn workspace @poe/admin-panel build
```
