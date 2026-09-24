# @poe/generator

The player's desktop app: it reads the published catalog, puts every item in a tier, styles
each tier from a per-category palette, and writes a `.filter`. Electron, with a React window.

The model is [`@poe/filter-style`](../../lib/filter-style). This app draws it, edits the
config, and writes the file.

## Structure

```
apps/generator/
├── main.ts                 # Electron main: binds every adapter to IPC, opens the window
├── preload.ts              # exposes one IPC call per adapter as window.generator
├── api/                    # the adapters. A root of its own, one folder per domain
│   ├── generator-api.ts    # GeneratorApi: every call the window can make. Types and constants only
│   ├── generator.ts        # binds each adapter to the lake
│   ├── catalog/            # the published catalog and its categories
│   ├── config/             # .s3/generator/config.json, and the defaults
│   ├── filter/             # writes the .filter where the player picks
│   └── util/               # lake keys, the repo root
├── renderer/               # the React window: panels/, components/, hooks/, utils/
└── electron.vite.config.ts
```

It follows the admin panel's rules: the window imports only types and constants from `api/`,
and never learns where a file is stored.

## What it does

- **Tiers.** One ladder per category: T0 to T5, then Want to see, then Hidden. The floors are
  global, and any tier can be switched off per category. A disabled tier's range falls to
  the tier below.
- **Take, Check, Gamble.** Three preview columns show where each item lands and how it is
  drawn. Check and gamble come from the taxonomy's `hints` on the category. Nothing prices a
  gamble yet.
- **Palette.** Each category has a primary colour, a secondary colour and an icon shape.
  Every tier's look follows from those.
- **Gold** is tiered by stack size. Each tier is a `StackSize` range.
- **Save config** writes `.s3/generator/config.json`. **Write filter** writes the whole
  `.filter` and asks where to put it.

## Config

`.s3/generator/config.json` holds the global floors and, per category, its palette, its
disabled tiers, its want-to-see list and, for a stack-size category, its own floors. With no
saved file the app starts from `api/config/default-config.ts`. Hints are not config: they
come from the taxonomy.

## Gotchas

- **One block per item.** The written filter is several megabytes. Merging blocks that share
  conditions is not decided.
- **The repo is found two folders above the app**, as in the admin panel. Run it from the
  checkout.
- **The preload is CommonJS**, because a sandboxed preload cannot be an ES module.

## How to run

From the repo root:

```bash
yarn generator
```

Type-check it. The root `yarn typecheck` does not cover it:

```bash
yarn workspace @poe/generator typecheck
```
