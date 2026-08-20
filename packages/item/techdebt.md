# Tech debt in `@poe/item`

What this package knowingly duplicates, and what it knowingly does not do yet. Written down
because the package was built without editing anything outside itself.

## Duplicated

### 1. `derollText` belongs beside `statKey`

`mod-text.ts` takes the bracketed range off a roll — `+149(145-159)` becomes `+149` — so
that `statKey` from `@util/core/stat-index` can key the line. Without it `statKey` reads the
game's notation as two numbers and produces `+## to maximum life`, which matches nothing:
measured over the sample items, that is the difference between 10 matches and 38.

The rule is about the same join `statKey` exists for, and it belongs in the same file. It
lives here because this package may not edit `@util/core`. Moving it there deletes a
function from `mod-text.ts` and costs nothing else — `statKey` is applied to both sides of
the join, so stripping the range on both sides is a no-op for the callers it already has.

### 2. `OPENING_RULES` in `item-cli.ts`

The same four lines and the same comment as `packages/filter/fetch-inputs.ts`. Both say the
same thing: a process making one request paces against the opening rule and never sees a
second. This repeats per file across the repo by convention rather than being shared, and
`HOUR_MS` in the various getters does the same; noted so the repetition is a choice on
record rather than an oversight.

## Not done

### 3. The basic copy format

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

### 4. Aggregate pseudo modifiers

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

### 5. Conditions `toFilterItem` leaves absent

Listed in that file's doc comment, and absent on purpose rather than defaulted, because the
evaluator reads a filled-in wrong value as fact. `AreaLevel` is drop context the caller
holds; `Width`, `Height`, `DropLevel` and the `Base*` defences are base-type data that lives
in GGG's item list; the eldritch implicit tiers and the gem conditions want wordings no
sample item shows.
