# generator

**A proof of concept.** `yarn generate` reads a config and a gold catalog and writes a
`.filter`. This is the spine: until something came out of here, every source the repo
collects was a leaf and nothing proved the whole thing works.

| File | State |
| --- | --- |
| `generate-cli.ts` | **Written.** `main()`: reads the config and the gold folder, generates, parses the text back with `@poe/filter-eval`, writes the file, prints what was skipped. |
| `generate-filter.ts` | **Written.** `(rows, categories, config) -> text`. Classify, merge, order, render — in that order and nothing else. |
| `generate-filter/` | The four steps and the config reader, one file each. |
| `generate.config.json` | The default config: the gold folder, the output path, the tiers with their Chaos floors and action lines, the corruption note floor. |
| `resolve-conditions.ts` | **Written.** Composes the `.filter` conditions for one catalog row — category, subcategory, item, variant — and answers with one rule per variant. |
| `notes.md` | What the catalog has learned that this app has to honour. One entry per thing. |

`resolveConditions` declares the row shape it reads, `CatalogRow`, rather than importing the
catalog's. An app is never imported by another, so `catalog.json` is the contract between the
two and it is a published format rather than a shared module.

## What the proof of concept does

```
(catalog.json, catalog.categories.json, generate.config.json) -> a .filter file
```

- **Tiers.** The config lists tiers, each with a Chaos floor and the action lines that style
  it. A price takes the highest tier whose floor it reaches; under every floor, the row gets
  no block and the game draws it.
- **Rows.** A row without variants is one block priced on its `meanPrice`; a row with
  variants is one block per priced variant. An unpriced rule is skipped and counted.
- **Uniques.** A base's `uniques` come grouped by category path, and each group is a block
  resolved through the same categories table as a row — `unique` and `unique/foulborn` are
  two disjoint blocks. The block takes the tier of the dearest uncorrupted form. When the
  cheapest sits lower the verb is `check` and the note names both: `floor "Ngamahu's Flame"
  2c ceiling "Headhunter" 3000c`. A corruption outcome at or over `uniques.corruptionMin` is
  named too, `corruption "Headhunter (+1 curse)" 9000c`, and the verb is `gamble` when that
  is all there is to say.
- **Grouping.** Blocks alike in everything but the row they name merge into one, with the
  names sorted on one line. The row-naming condition is the one the taxonomy wrote with
  `from`, which `resolveConditions` keeps on the filled condition for exactly this.
- **Ordering.** Derived, never authored: more conditions first, then the louder tier, then
  the text. A block with more conditions matches fewer items, so every narrower block lands
  ahead of the wider one it sits inside — a base's unique blocks before the base's own.
- **Check.** The text goes through `parseFilter` before it is written. A block the game would
  reject fails here, naming the line.

**Nothing here knows a game fact.** The conditions come off the catalog and the look comes
off the config. A new league is a taxonomy record and a catalog run, and this app stays as
it is.

## What it does not do yet

- The total check: run every catalog row through the parsed filter and assert the block that
  takes it is the block that was meant to. `@poe/filter-eval` can do it; the rows are not
  turned into `FilterItem`s yet.
- A confidence signal. PoeWatch's `lowConfidence` and `daily` stop at the service types, so
  a thin market can set a loud block.
- `Hide`. Every block is `Show`; a price under every tier's floor is left to the game.

## The rule that makes the rest possible

**The `.filter` is a build output. Nothing ever edits it.**

Anything that "modifies the filter" — a UI, a plain-text instruction — modifies the
**config** instead, and the generator stays a pure function of its three inputs.
Regenerating is then always safe, because nothing in the output is not derived from an
input.

The config has to stay small enough for a person to read. A knob per bucket cannot be
presented in a UI or patched reliably from a sentence; a knob per decision a player can
hold an opinion about can be both.

## How to run

The config names the gold folder and the output; `--catalog=` and `--output=` override them.
No environment.

```bash
yarn generate --config=apps/generator/generate.config.json
```

[`docs/item-filter-syntax.md`](../../docs/item-filter-syntax.md) is the grammar. Anything
emitted here has to be a line in there.
