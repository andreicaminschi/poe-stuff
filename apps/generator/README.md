# generator

**Not written yet, and never has been.** This folder holds the intent, not the code.

This is the spine. Until something comes out of here, every source the repo collects is a
leaf and nothing proves the whole thing works.

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

- `apps/catalog` — the catalog. One row per item, carrying a canonical id, what the item
  is, and what it is worth with provenance on the price. The classifier needs a number
  **and** a confidence signal: a thin market must not be able to set a loud block.
- [`docs/item-filter-syntax.md`](../../docs/item-filter-syntax.md) is the grammar. Anything
  emitted here has to be a line in there.
