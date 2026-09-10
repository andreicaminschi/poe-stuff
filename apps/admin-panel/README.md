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
├── api/                    # the adapters — the contracts
│   ├── panel-api.ts        # PanelApi: every call the window can make. Types and constants only
│   ├── panel.service.ts    # binds each adapter to the repo
│   ├── <app>.<action>.api.ts
│   ├── taxonomy.types.ts   # the six files as apps/taxonomy writes them, and the panel's words for them
│   ├── keys.ts             # the lake layout, the only place the panel names a path
│   ├── lake.ts             # reads and writes under .s3
│   └── yarn.ts             # runs a yarn command
├── renderer/               # the React window
└── electron.vite.config.ts
```

## The adapter rule

Every call the window makes is one `.api.ts`. It names the data model — what the file or the
command holds — and the domain model the window works in, and maps one to the other.

- **Data calls** read and write the lake directly (`getVersions`, `getVersion`, `saveDraft`,
  `getRuns`), or parse JSON off a command's stdout (`validate`, `resolveItem`,
  `resolveCategory`).
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
- **"This item matches" comes from the taxonomy.** `yarn taxonomy resolve` runs against the
  saved draft, so an unsaved edit shows its result after a save. The panel computes no
  override.
- **Publish validates, publishes and promotes**, in that order, after a confirm.
- **One league, Allflame. One catalog build at a time**, because GGG counts requests per IP.

## Gotchas

- **The PoeWatch name list is a stub.** `prices.getNames.api.ts` returns nothing, so "Listed
  as" is typed by hand until something publishes the names.
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
