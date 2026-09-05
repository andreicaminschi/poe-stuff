# Tech debt

What the repo knowingly duplicates, and what it knowingly does not do yet. One section per
package, and every package writes here rather than into a file of its own — a note is only
useful where the next person already looks, and that is one file at the root.

A note says what is wrong, why it was left, and what undoing it costs. Anything already
fixed comes out.

## `@poe/item-parser`

Written down because the package was built without editing anything outside itself.

### Duplicated

#### 1. `derollText` belongs beside `statKey`

`mod-text.ts` takes the bracketed range off a roll — `+149(145-159)` becomes `+149` — so
that `statKey` from `./stat-index.ts` can key the line. Without it `statKey` reads the
game's notation as two numbers and produces `+## to maximum life`, which matches nothing:
measured over the sample items, that is the difference between 10 matches and 38.

The rule is about the same join `statKey` exists for, and it belongs in the same file.

**The reason it was left is gone.** It lived apart because `statKey` was in `@util/core` and
this package could not edit it; the restructure moved `stat-index.ts` into this package as a
private file, so both halves of the join are now owned here. Doing it deletes a function
from `mod-text.ts` and costs nothing else — `statKey` is applied to both sides of the join,
so stripping the range on both sides is a no-op for the callers it already has.

### Not done

#### 2. The basic copy format

The game copies the advanced description format, and that is what `parse-item.ts` reads.
The trade site's own export still writes the older one: no `{ … }` headers, no tiers, no
tags, and the kind written as a lowercase suffix — `+42% to Fire Resistance (implicit)`.

One piece of it already works. `parse-properties.ts` reads a trailing `(word)` on a bare
line as a modifier and hands the word to the matcher as a header qualifier, which is how
`Allocates Discipline and Training (enchant)` resolves today. Everything else is missing: a
basic-format item has no section separating implicits from explicits, so affixes cannot be
told apart, and nothing on it carries an affix name for `HasExplicitMod`.

Modifiers read from that format also stay ambiguous. Preferring a candidate by the kind the
header names is what takes the sample items from 33 ambiguous matches down to 2, and a
suffix names the kind for only some of them.

#### 3. Aggregate pseudo modifiers

`match-mods.ts` derives alias pseudos only — the ones whose published text is the same text
the item prints, which is the temple rooms, the logbook areas, the lake reflections and the
eldritch implicit tiers. Those are exact and need no rules at all.

The pseudos people actually search on are the aggregates: `+# total maximum Life`,
`+#% total to Cold Resistance`, `+#% total Elemental Resistance`, `# total Resistances`, and
the `Adds # to # Fire Damage` family. Each is a sum over the modifiers that contribute to
it, and the contributors are not published — the trade site works them out server-side.

Deriving them automatically is possible and was sketched: read the aggregation shape out of
the pseudo's own wording (`total to X`, `total X`, `total increased X`, `Adds # to # X
Damage`, `# total Xs`), then let any matched modifier whose text names the same subject
contribute. It needs one fixed vocabulary that new modifiers never change — the three
elements, the three attributes, and the `all Elemental Resistances` / `all Attributes`
umbrellas that cover several subjects at once. That vocabulary is game grammar, not a mod
list, which is what keeps the result maintenance-free.

It is not built. Alias pseudos were the part that could be had with no rules, and the ask
was for pseudos only where they could be automated.

#### 4. Conditions `toFilterItem` leaves absent

Listed in that file's doc comment, and absent on purpose rather than defaulted, because the
evaluator reads a filled-in wrong value as fact. `AreaLevel` is drop context the caller
holds; `Width`, `Height`, `DropLevel` and the `Base*` defences are base-type data that lives
in GGG's item list; the eldritch implicit tiers and the gem conditions want wordings no
sample item shows.

## `apps/taxonomy`

### Not done

#### No list maps PoeWatch's foulborn labels to stats

`Foulborn Headhunter (Culling, Minimap Icons)` names its mods the way PoeWatch abbreviates
them, not the way the game prints them or the trade site indexes them. Nothing in the tree
holds that mapping, and neither RePoE's `ModFoulbornMap.json` nor GGG's stat list carries
the labels.

It has to be a hand-kept table, one row per label PoeWatch uses: the label, the stat text,
and the trade stat id. It breaks silently when PoeWatch renames a label or a league adds a
mod, so it belongs where the other hand-maintained data lives, `apps/taxonomy`.

Nothing needs it today. It was written down when a trade link wanted to name the exact form
a price came from, and whatever builds that link next will want it again.
