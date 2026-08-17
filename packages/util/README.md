# @util/core

Three dependency-free helpers every other package leans on: env reads, cache keys, sleep.

## Purpose

`process.env` is read here and nowhere else, so a missing variable fails with one message
that names the variable and the command that would supply it. `cacheKey` turns a tuple of
strings into one stable key that two different tuples can never share. `sleep` is a
promise around `setTimeout`.

It does not load `.env` files — that is `node --env-file=packages/<name>/.env`. No config
schema, no validation beyond present-or-not, no cache of its own, no I/O. `node:crypto` is
the only import.

## Structure

```
packages/util/
├── cache-key.ts       # cacheKey — sha256 over length-prefixed parts, namespace kept outside the digest
├── cache-key.test.ts  # collision, ordering and namespace cases for cacheKey
├── env.ts             # requireEnv / optionalEnv — the only reads of process.env
├── sleep.ts           # sleep — promise around setTimeout
└── package.json       # @util/core, subpath exports, no dependencies
```

## Public API

| Entry point | Exports | Contract |
| --- | --- | --- |
| `@util/core/cache-key` | `cacheKey(namespace, ...parts)` | Returns `` `${namespace}:${sha256hex}` ``. Same parts → same key, across calls, processes and machines. Order-sensitive. |
| `@util/core/env` | `requireEnv(name)` | Returns the variable's value. Throws if unset or empty. |
| `@util/core/env` | `optionalEnv(name)` | Returns the value, or `undefined` if unset or empty. |
| `@util/core/sleep` | `sleep(ms)` | Resolves after `ms` milliseconds. |

## Examples

### Fail loud on a missing variable

```ts
import { requireEnv } from "@util/core/env";

const clientId = requireEnv("POE_CLIENT_ID");
// unset → Error: Missing POE_CLIENT_ID. Run with: node --env-file=packages/<name>/.env <script>
```

### Fall back when a variable is optional

```ts
import { optionalEnv } from "@util/core/env";

const league = optionalEnv("POE_LEAGUE") ?? "Standard";
// POE_LEAGUE unset, or set to the empty string → "Standard"
```

### Key a trade search by its inputs

```ts
import { cacheKey } from "@util/core/cache-key";

const key = cacheKey("search", "Rise of the Abyssal", "chaos orb");
// "search:0ca8976fbd7b5937dfaeea7f15997fa61d83bdfa0018a66aac4ad6f6a4e3c3dc"
```

Namespace stays outside the digest, so `cacheKey("pages", "a")` and `cacheKey("search", "a")`
never collide, and both stay readable in logs.

### Pause between paged requests

```ts
import { sleep } from "@util/core/sleep";

// … pages, fetchPage

for (const page of pages) {
  await fetchPage(page);
  await sleep(1_000);
}
```

## Gotchas

- **Empty string counts as unset.** `optionalEnv` maps `""` to `undefined`, so a line of
  `POE_CLIENT_ID=` in a `.env` file makes `requireEnv` throw, same as omitting it.
- **Argument order is part of the key.** `cacheKey("search", "a", "b")` and
  `cacheKey("search", "b", "a")` are different keys. Reordering the arguments at a call
  site orphans every key already written under the old order.
- **A `:` in the namespace is ambiguous.** Only the parts are length-prefixed; the
  namespace is joined raw. Anything splitting a key back on `:` gets the wrong namespace.
- **A pending `sleep` holds the process open.** The timer is not `unref`ed, so Node will
  not exit until it fires.

## How to run

Run the package's tests:

```bash
yarn test packages/util
```

Type-check the workspace:

```bash
yarn typecheck
```
