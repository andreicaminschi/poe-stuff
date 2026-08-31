# item-inspect

Paste an item copied out of the game, see how the parser read it.

```bash
node --env-file=apps/item-inspect/.env apps/item-inspect/item-cli.ts data/sample-items/rare-ring.txt
node --env-file=apps/item-inspect/.env apps/item-inspect/item-cli.ts --filter-item < item.txt
```

Without `--filter-item` it resolves every modifier against GGG's published stat list and
prints the trade ids each line could be. That costs **one GGG request per run** — the
service takes a cache as an option and nothing here builds one, so the cost is visible
rather than hidden behind a directory that may or may not be warm.

With `--filter-item` it prints the shape `@poe/filter-eval` asks conditions about, and makes
no request at all — the filter shape is structural and needs no stat ids, so that path needs
no environment either.

## Why this is an app and not part of the library

It was `lib/item-parser/item-cli.ts`, and that was the one thing in `lib/` breaking the
tier rule. It reads `POE_USER_AGENT`, builds a GGG service and touches `process.argv` and
stdin — every one of which a library is not allowed to do, because `lib/` has to keep
working when it is loaded somewhere with no environment and no network.

Moving it took the last runtime impurity out of `@poe/item-parser`, and let that package
drop `@poe/ggg` and `@util/env` from its dependencies entirely. What is left there is pure
and depends only on another library.

The library still needs the stat list — it just no longer knows where one comes from.
`PublishedStat` in [`lib/item-parser/types.ts`](../../lib/item-parser/types.ts) declares
the shape `modMatcher` is built over, and `createGGGService(…).getStats()` answers with
exactly that shape, so fetching it is this app's job and passing it in costs no adapter.

## Environment

| Var | Holds |
| --- | --- |
| `POE_USER_AGENT` | Sent on the one GGG request. Must name the app and a real contact address — GGG refuses to default it, because a default would send a contact that does not exist. |

The limiter opens at one request per second and never sees a second, so GGG's own
rate-limit headers arrive too late to matter here.
