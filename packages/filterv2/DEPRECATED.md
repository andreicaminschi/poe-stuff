# DEPRECATED — `@poe/filterv2`

**This package is a POC. It will be removed. Do not add to it, and do not import it.**

Replaced by [`apps/poe-items`](../../apps/poe-items), which is not written yet.

## State

**It compiles**, and is still excluded from `tsconfig.json` and `jest.config.js` along with
`@poe/workers`, because nothing should be building against it.

**The forum source was removed.** It read the league's Item Filter Information post through
`getNewsPage`, `getForumThread` and `forumThreadUrl`, and all three were deleted from
`@poe/ggg` — the service now covers the trade API and the Currency Exchange CDN only. Rather
than leave the package broken, the whole branch came out: the forum walk, the `claude -p`
extraction, new-league detection, and the renames and additions the post applied.

What that costs is written down in [README.md](README.md#the-source-that-was-removed). The
short version: three sources instead of four, no `newLeague`, no `isNew`, and **a league
launch is now invisible** — RePoE lags one by days and the post was the only thing that did
not.

`data/items.json` is its output and is gitignored. `data/forum-posts/` is now orphaned —
nothing reads it — but it is kept: three leagues of extracted posts, one `claude -p` call
each, and the best reference for what a future reader has to produce.

## Why it is still here

The merge order is the part worth copying exactly, and it is written down in
[`README.md`](README.md), [`notes.md`](notes.md) and the `.mmd` diagrams beside the files
they draw. [`apps/poe-items/README.md`](../../apps/poe-items/README.md) lists what carries
over.

`notes.md` is the more valuable of the two: it records what the build gets **wrong** and
what it has not decided yet. Those are decisions about the game rather than about the code,
so every one of them comes back the moment something builds an item list again.

## What was here

| File | Was |
| --- | --- |
| `build-item-list.ts` | the three sources merged, in the order that makes RePoE win |
| `build-item-list/collect-items.ts` | `/data/items` for everything but currency, the exchange for currency |
| `build-item-list/fill-from-repoe.ts` | the game's own export, last and winning |
| `types.ts` | the item row — every field `readonly`, which is the whole design |
