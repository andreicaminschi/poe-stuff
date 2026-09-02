# @poe/taxonomy

One published version of the item taxonomy, read back by version.

## Purpose

The taxonomy says what category and subcategory an item belongs to, keyed by the metadata id
the game's own data gives it. `apps/taxonomy` writes the versions; this package reads one
back and resolves `latest` to whichever version was promoted.

An entry can also override three things the sources get wrong: `filterable` says a `.filter`
cannot name the row, `tradable` and `tradedOnExchange` say whether it can be obtained at all.
All three are absent on almost every row, and absent means take the sources' answer.

It stops at the bytes. The service is handed a store — an object with a single `read(key)` —
and never learns whether that key is a file, an object in a bucket or a URL. It also does no
validation: what comes back is returned as `Taxonomy` on the writer's word.

## Structure

```
services/taxonomy/
├── service.ts               # createTaxonomyService — the only constructor
├── get-taxonomy.ts          # resolve a version, read it, or raise
├── get-taxonomy.types.ts    # Taxonomy, TaxonomyEntry, TaxonomyPointer
├── types.ts                 # TaxonomyStore and the constructor's options
├── config.ts                # the key layout and the default prefix
├── errors.ts                # TaxonomyNotFoundError
└── package.json
```

## Public API

| Import | Exports | Contract |
| --- | --- | --- |
| `@poe/taxonomy/service` | `createTaxonomyService`, `TaxonomyService` | Takes a store and an optional prefix. `getTaxonomy(version?)` answers with one version, or the promoted one when no version is named. |
| `@poe/taxonomy/get-taxonomy.types` | `Taxonomy`, `TaxonomyEntry`, `TaxonomyPointer` | Types only. `Taxonomy.items` is keyed by metadata id, so a lookup is a property access. |
| `@poe/taxonomy/types` | `TaxonomyStore`, `TaxonomyServiceOptions` | Types only. `TaxonomyStore` is what a caller implements. |
| `@poe/taxonomy/errors` | `TaxonomyNotFoundError` | Carries the `key` that was missing. |

**Not exported.** `config.ts` exports `DEFAULT_PREFIX`, `POINTER_FILE`, `versionKey` and
`pointerKey`, and none of them appear in the `exports` map. They are reachable only from
inside the package.

## Examples

### Read the version that is current

```ts
import { createTaxonomyService } from "@poe/taxonomy/service";

const taxonomy = await createTaxonomyService({ store }).getTaxonomy();

console.log(taxonomy.version); // "3.29"

// Keyed by metadata id. Two items can share a display name, so a name-keyed table gave the
// skill gem `Wildfire` and the unique jewel `Wildfire` one classification between them.
console.log(taxonomy.items["Metadata/Items/Currency/CurrencyDelveCraftingMinionsAuras"]);
// { name: "Bound Fossil", category: "fossil", subcategory: null }
```

### Pin a run to one version

```ts
const service = createTaxonomyService({ store });

// Resolve once, then pass the version on. Reading `latest` twice in one run can straddle
// a promote and answer with two different tables.
const { version } = await service.getTaxonomy();
const same = await service.getTaxonomy(version);
```

### Write a store over a local folder

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { TaxonomyStore } from "@poe/taxonomy/types";

const folderStore = (root: string): TaxonomyStore => ({
  async read(key) {
    try {
      return JSON.parse(await readFile(join(root, ...key.split("/")), "utf8")) as unknown;
    } catch {
      return undefined;
    }
  },
});

const service = createTaxonomyService({ store: folderStore(".s3") });
```

### Tell a missing version from a broken read

```ts
import { TaxonomyNotFoundError } from "@poe/taxonomy/errors";

try {
  await createTaxonomyService({ store }).getTaxonomy("3.30");
} catch (error) {
  if (error instanceof TaxonomyNotFoundError) {
    console.log(`nothing published at ${error.key}`); // taxonomy/3.30.json
  } else {
    throw error;
  }
}
```

## Environment

This package reads none. It has no `.env` and never touches `process.env` — the store and
the prefix are constructor arguments, so whoever builds the service decides where a
taxonomy comes from.

## Gotchas

- **Resolving `latest` is two reads, and they can disagree.** `latest.json` holds a version
  string rather than a copy of the table. Two calls to `getTaxonomy()` in one run can land
  either side of a promote and return different tables. Resolve the version once and pass it
  from then on.
- **Nothing checks the payload.** A file that parses as JSON is returned as `Taxonomy`
  whatever is in it. A caller that cares validates what it got.
- **A missing key is an error, not an empty answer.** `getTaxonomy()` before anything has
  been promoted raises `TaxonomyNotFoundError` for `taxonomy/latest.json`.
- **The key layout is a shared format, not shared code.** This package builds
  `taxonomy/<version>.json` and `taxonomy/latest.json` from its own `config.ts`, and
  `apps/taxonomy` builds the same strings from its own. Changing one without the other
  breaks the read at runtime, with nothing failing at compile time.

## How to run

Type-check every live package:

```bash
yarn typecheck
```

Run this package's tests:

```bash
yarn test services/taxonomy
```
