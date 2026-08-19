# @poe/ggg as a service

Goal: `@poe/ggg` stops being a bare HTTP client and becomes the GGG service — it owns
every GGG URL and exposes one function per endpoint, the way `@poe/poe-watch` does.

`call`, `createLimiter` and the header parsing stay exactly as they are. Nothing about
pacing changes. What changes is that the endpoint wrappers and the URLs move in, and the
limiter/cache keep being handed in by the caller rather than made here — one process,
one limiter per budget, unchanged.

## Stages

- **Stage 1 — ggg gains the service surface.** This document's steps. Touches only
  `packages/ggg`. Workers keeps its own copies and keeps compiling.
- **Stage 2 — workers switches over.** Not now. Listed at the bottom.

## Stage 1 steps

| # | File | Change |
| --- | --- | --- |
| 1 | `packages/ggg/config.ts` (new) | `tradeApiUrl()` and `currencyApiUrl()`, read from `POE_TRADE_API_URL` / `POE_CURRENCY_API_URL`, trailing slash stripped. Copied from `workers/config.ts`. |
| 2 | `packages/ggg/types.ts` | Add `GggContext` (limiter + optional cache + optional onEvent), `SearchResponse`, `FetchResponse`, `CurrencyExchange`, `CurrencyMarket`, `TradeItemsResponse`, `UniqueItem`. |
| 3 | `packages/ggg/search.ts` (new) | `search(query, league, context)`. `workers/post-search.ts` moved and renamed. |
| 4 | `packages/ggg/fetch-page.ts` (new) | `fetchPage(hashes, searchId, context)`. `workers/fetch-page.ts` moved. |
| 5 | `packages/ggg/fetch-currency-hour.ts` (new) | `fetchCurrencyHour(hourId, context)`. `workers/fetch-currency.ts` moved. |
| 6 | `packages/ggg/get-unique-items.ts` (new) | `getUniqueItems(context)` — `GET /data/items`, returns `{name, type}[]` for entries flagged unique. Hour-bucketed `fileCache` in front of it, keyed `cacheKey("trade-items", <hour>)`, rooted at `CACHE_DIR`. Same shape as `poe-watch/get-compact-data.ts`: the hour is in the key, so an entry is only read back inside the hour that wrote it, and an unset `CACHE_DIR` means every call downloads. Local only. |
| 7 | `packages/ggg/package.json` | Add `./config`, `./search`, `./fetch-page`, `./fetch-currency-hour`, `./get-unique-items` to `exports`. |

Then: `packages/ggg/README.md` and the root `CLAUDE.md` both say the package knows no
URLs. Both get corrected in the same pass.

## Verify

```
node --env-file=packages/workers/.env packages/filter/unique-items-cli.ts > uniques-ggg.json
```

Run it twice inside one hour with `CACHE_DIR` set: the second run makes no request. Then
`yarn typecheck` — workers is untouched and must still pass.

## Stage 2 — worker refactor (todo, not now)

1. `packages/workers/handlers.ts` — import `search`, `fetchPage`, `fetchCurrencyHour`
   from `@poe/ggg` instead of the local files.
2. Delete `packages/workers/post-search.ts`, `fetch-page.ts`, `fetch-currency.ts`.
3. `packages/workers/config.ts` — drop `tradeApiUrl` and `currencyApiUrl`; keep
   `FETCH_CHUNK`, `MAX_PAGES`, the currency hour arithmetic and `currencyLeague`, which
   are pipeline policy, not GGG.
4. `packages/workers/types.ts` — drop `TradeContext`, `SearchResponse`, `FetchResponse`,
   `CurrencyExchange`, `CurrencyMarket`; re-point `worker.ts` and `handlers.ts` at the
   `@poe/ggg` types.
5. `packages/workers/package.json` — drop `./fetch-currency` from `exports`; add
   `@poe/ggg` to `dependencies`, which is currently missing.
6. `packages/workers/docs/pipeline.md` — the env table and the diagrams name the moved
   files.
7. Two things stage 1 deliberately leaves alone:
   - `postSearch`/`fetchPage`/`fetchCurrencyHour` exist twice until step 2 above deletes
     the workers copies. Stage 1 buys that duplication to keep the pipeline untouched.
   - `packages/workers/package.json` imports `@poe/ggg` without declaring it. It resolves
     through the workspace hoist today. Same for `@poe/ggg` importing `@util/core`, and
     for the new `@poe/filter`.
