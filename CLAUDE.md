# poe-stuff


## Environment

- Node 26, yarn 1, git
- Endpoints live in `.env` — read from there rather than hardcoding URLs.

## TypeScript

No build step. Node 26 runs `.ts` directly by stripping types; `tsc` only type-checks
(`noEmit`). Run scripts with `node --env-file=.env tools/foo.ts`.

Consequences of type stripping, enforced by `erasableSyntaxOnly` + `verbatimModuleSyntax`:

- No `enum`, `namespace`, or constructor parameter properties — use `const` objects and
  plain assignment.
- Relative imports keep the `.ts` extension: `import { x } from "./bar.ts"`.
- Type-only imports need `import type`.

`yarn typecheck` (or `typecheck:watch`) before considering a change done.

## Gotchas

- GGG's Cloudflare 403s any request without a descriptive `User-Agent`. Send one on
  every call to `pathofexile.com`.

## .env explained

### POE_STATS_URL
This is where all the possible stats for the items are found