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

#### The taxonomy has one copy

Every version lives in `.s3/taxonomy`, on one disk, out of git. That was the decision — a copy
per version would grow the repository forever — but until the lake is a real bucket with
durability of its own, a lost disk loses every patch's hand work. Undoing it is a backup job,
not a code change.

## `apps/catalog`

### Not done

#### Publishing writes two files, not one

`catalog:publish` copies `catalog.json` and `catalog.categories.json` into `latest/`. Each
write is atomic, so no reader sees half a file. A failure between the two leaves one new file
beside one old one, and nothing detects the mismatch. Fixing it means one file, or a manifest
written last that a reader checks — both change what a consumer reads.

## `apps/generator`

### Duplicated

#### The published catalog's keys and row shape

`apps/generator/lake/keys.ts` rebuilds `catalog/latest/<league>.*.json`, which
`apps/catalog/lake/keys.ts` already owns, and `domains-cli.ts` restates the fields of `Item`
from `apps/catalog/item.ts`. An app never imports an app, so there is nowhere shared to put
either. A renamed key or a renamed field breaks the generator at runtime with no type error.
Undoing it means the published catalog's contract moves into a service or a lib, the way the
taxonomy's did.

### Not done

#### An open numeric domain cannot be written out

`ItemLevel` resolves to a domain with no bounds, because the catalog only ever says `>= 84` or
`<= 83` and never the range itself. A condition with no domain cannot be filled in, so item
level stays a wildcard and the blocks that leave it out still depend on their order. Either
the taxonomy declares the range, or the generator keeps a specificity rule for numeric axes
alone.

## `apps/admin-panel`

### Duplicated

#### The lake layout, a third time

`api/keys.ts` builds the same key strings as `apps/taxonomy/lake.ts` and
`services/taxonomy/config.ts`, and the catalog's run layout as `apps/catalog/lake/keys.ts`.
Reading and writing go through `@poe/lake`, but the keys are each app's own, so this is by
convention and nothing checks it. A changed layout breaks
the panel at runtime.

#### The publish rule

`taxonomy.getVersions.api.ts` works out which draft is editable with the same rule as
`highestDraft` in `apps/taxonomy/registry.ts`: the newest version, while it is a draft. The
panel needs the answer to draw a read-only screen, and asking the taxonomy would cost a
process per version list. If the rule changes in one place only, the panel offers edits the
taxonomy then refuses to publish.

#### The six file shapes

`api/taxonomy.files.ts` restates the file shapes from `apps/taxonomy/types.ts`. They are the
data model the adapters map from, and a field added to the taxonomy is invisible to the panel
until it is added here.

