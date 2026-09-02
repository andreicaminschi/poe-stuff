# generator

**One file written, and it is not the spine yet.** This folder still holds mostly intent.

This is the spine. Until something comes out of here, every source the repo collects is a
leaf and nothing proves the whole thing works.

| File | State |
| --- | --- |
| `resolve-conditions.ts` | **Written.** Composes the `.filter` conditions for one catalog row — category, subcategory, item, variant — and answers with one rule per variant. |
| `notes.md` | What the catalog has learned that this app has to honour. One entry per thing. |

`resolveConditions` declares the row shape it reads, `CatalogRow`, rather than importing the
catalog's. An app is never imported by another, so `catalog.json` is the contract between the
two and it is a published format rather than a shared module.

## What it will own

```
(items, prices, config) -> a .filter file
```

Four stages, and the third is the one that is easy to get wrong:

1. **Classify.** Every item gets a decision — how loud, and why — from its item-list row,
   its price and the config. Keep the numbers the decision was made from; they are the only
   way to answer "why is this red" later, and that question comes up in three places.
2. **Group.** One block per item is unreadable. Items sharing a decision collapse into one
   block, and the group has to be expressible as filter conditions — a `BaseType` list, a
   `Class`, predicates over `ItemLevel`, `Rarity`, `Quality`, `Sockets`. A group that cannot
   be written as conditions is not a group, which is how the grammar pushes back on the
   classifier.

   **The conditions are not invented here.** The taxonomy authors them, per category, per
   subcategory and per item, and `resolve-conditions.ts` lays the levels over each other for
   one row. That is what keeps a league start from reaching this app: a new mechanic is a
   record in the taxonomy, not a branch in the grouper. Two rows in one bucket resolving to
   different conditions is fine — they are two blocks sharing one look.
3. **Order.** First match wins, so a specific block must precede the general one that would
   swallow it. **Derive this from selector specificity — never author it.** A hand-ordered
   block list means every new rule can silently shadow an older one, and the failure is
   invisible: no error, no warning, just an item that stopped showing.
4. **Emit.** Text. It should be boring; if emitting is complicated, the grouping is leaking.

## The rule that makes the rest possible

**The `.filter` is a build output. Nothing ever edits it.**

Anything that "modifies the filter" — a UI, a plain-text instruction — modifies the
**config** instead, and the generator stays a pure function of its three inputs.
Regenerating is then always safe, because nothing in the output is not derived from an
input.

The config has to stay small enough for a person to read. A knob per bucket cannot be
presented in a UI or patched reliably from a sentence; a knob per decision a player can
hold an opinion about can be both.

## The check this can do that most filter generators cannot

`@poe/filter-eval` shares no code with this app on purpose. So after emitting: run **every**
item in the list through the parsed filter and assert the block that takes it is the block
that was meant to.

That is a total check, not a sample. It catches shadowing, condition bugs and grammar
mistakes in one pass, and it fails the build rather than the league start. For it to work,
each block needs a stable id in its `#@` note, derived from the group's selector rather than
from its position — which is also how a UI addresses a block, and what makes a diff between
two generated filters readable.

## What has to exist first

- `apps/catalog` — **half of it exists.** Its gold stage writes `catalog.json`, every
  filterable row with the conditions the taxonomy authored for it, and
  `catalog.categories.json`, the flattened category tree those hang off. Both are what
  `resolveConditions` takes.

  What is missing is the money. A row says what an item is and not what it is worth, and the
  classifier needs a number **and** a confidence signal — a thin market must not be able to
  set a loud block. Prices arrive from poe.watch and are not collected yet.
- [`docs/item-filter-syntax.md`](../../docs/item-filter-syntax.md) is the grammar. Anything
  emitted here has to be a line in there.
