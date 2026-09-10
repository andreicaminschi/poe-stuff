# @poe/taxonomy

One published version of the item taxonomy, read back by version.

## Purpose

The taxonomy says what category and subcategory an item belongs to, keyed by the metadata id
the game's own data gives it. `apps/taxonomy` writes the versions; this package reads one
back and resolves `latest` to whichever version was promoted.

An entry can also override three things the sources get wrong: `filterable` says a `.filter`
cannot name the row, `tradable` and `tradedOnExchange` say whether it can be obtained at all.
All three are absent on almost every row, and absent means take the sources' answer.

A version has a second table, `categories`, published as its own file and read with
`getCategories`. It is keyed by path — `map` beside `map/blighted`, the tree flattened into
the key. Each record holds the `.filter` conditions every row under
it matches on, and an item can override them or split into priced variants. The language and
how the levels compose are documented where they are authored, in
[apps/taxonomy/README.md](../../apps/taxonomy/README.md).

It reads the published files straight off disk, under a `root` it is given (default `.s3`).
It does no validation: what comes back is returned as `Taxonomy` on the writer's word.

## Structure

```
services/taxonomy/
├── service.ts               # createTaxonomyService — the only constructor
├── get-taxonomy.ts          # one version's rows, or raise
├── get-taxonomy.types.ts    # Taxonomy — the contract
├── get-categories.ts        # one version's category table, or raise
├── get-categories.types.ts  # TaxonomyCategories — the contract
├── types.ts                 # the constructor's options, and every type the contracts are built from
├── config.ts                # the key layout and the default prefix
├── errors.ts                # TaxonomyNotFoundError
└── package.json
```

## Public API

| Import | Exports | Contract |
| --- | --- | --- |
| `@poe/taxonomy/service` | `createTaxonomyService`, `TaxonomyService` | Takes an optional `root` (default `.s3`) and `prefix` (default `taxonomy`). `getTaxonomy(version?)` answers with one version's rows, `getCategories(version?)` with its category table; either takes the promoted one when no version is named. |
| `@poe/taxonomy/get-categories.types` | `TaxonomyCategories` | Types only. `{ version, categories }`. |
| `@poe/taxonomy/get-taxonomy.types` | `Taxonomy` | Types only. `Taxonomy.items` is keyed by metadata id, so a lookup is a property access. |
| `@poe/taxonomy/types` | `TaxonomyServiceOptions`, `Condition`, `ListingMatch`, `TaxonomyVariant`, `TaxonomyEntry`, `TaxonomyAuthored`, `TaxonomyCategory`, `TieringMethod` | Types only. |
| `@poe/taxonomy/errors` | `TaxonomyNotFoundError` | Carries the `key` that was missing. |

**Not exported.** `config.ts` exports the default prefix and every key builder, and none of
them appear in the `exports` map. They are reachable only from
inside the package.

## Examples

### Read the version that is current

```ts
import { createTaxonomyService } from "@poe/taxonomy/service";

const taxonomy = await createTaxonomyService().getTaxonomy();

console.log(taxonomy.version); // "3.29.4"

// Keyed by metadata id. Two items can share a display name, so a name-keyed table gave the
// skill gem `Wildfire` and the unique jewel `Wildfire` one classification between them.
console.log(taxonomy.items["Metadata/Items/Currency/CurrencyDelveCraftingMinionsAuras"]);
// { name: "Bound Fossil", category: "fossil", subcategory: null }
```

### Pin a run to one version

```ts
const service = createTaxonomyService({ root: ".s3" });

// Read the version off the rows, then ask for that version's categories.
const rows = await service.getTaxonomy();
const { categories } = await service.getCategories(rows.version);
```

### Tell a missing version from a broken read

```ts
import { TaxonomyNotFoundError } from "@poe/taxonomy/errors";

try {
  await createTaxonomyService().getTaxonomy("3.30.1");
} catch (error) {
  if (error instanceof TaxonomyNotFoundError) {
    console.log(`nothing published at ${error.key}`); // taxonomy/3.30.1.json
  } else {
    throw error;
  }
}
```

## Environment

This package reads none. It has no `.env` and never touches `process.env` — the root and
the prefix are constructor arguments.

## Gotchas

- **`latest` is a copy, so one call is one table.** `taxonomy/latest/taxonomy.json` holds
  the promoted version whole, with its own `version` inside. Two calls to `getTaxonomy()` in
  one run can still land either side of a promote. Read the version off the first answer and
  pass it from then on.
- **The rows and the categories are two files.** A promote writes them one after the other,
  so a reader can get one of each. Read the rows, then ask `getCategories(rows.version)`.
- **It reads a local folder and nothing else.** A bucket or an HTTP host needs a change here,
  not an option.
- **Nothing checks the payload.** A file that parses as JSON is returned as `Taxonomy`
  whatever is in it. A caller that cares validates what it got.
- **A missing key is an error, not an empty answer.** `getTaxonomy()` before anything has
  been promoted raises `TaxonomyNotFoundError` for `taxonomy/latest/taxonomy.json`.
- **The key layout is a shared format, not shared code.** This package builds
  `taxonomy/<version>.json` and `taxonomy/latest/taxonomy.json` from its own `config.ts`, and
  `apps/taxonomy` and `apps/admin-panel` build the same strings from their own. Changing one without the other
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
