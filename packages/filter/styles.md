# Styles

How a block is drawn. [`styles.ts`](styles.ts) composes it; this is why it is shaped that
way.

**The docs in `buckets/` are the table now.** Every rung's look lives in `tiers.json` beside
its cut, as four words — a template, a sound, a size, a beam — and `styles.ts` is what those
four words mean. The version before this spelled fourteen rungs out longhand in code and
could disagree with the design docs without anything noticing.

## The five tables

| Table | Holds | Source |
| --- | --- | --- |
| `COLOURS` | nine names as `R G B A` | `buckets/buckets.md`, plus the values noted below |
| `TEMPLATES` | the `C:`, `U:`, `Bases:`, `Gems:` and `maps:` rows | `buckets/buckets.md` verbatim |
| `SOUNDS` | Whoosh `6 300`, Zdrang `1 300`, Bonk `2 300`, Unique `3 300` | `buckets/buckets.md` |
| `SIZES` | XL 45, L 35, M 30, S 26, XS 18 | `buckets/buckets.md`, plus `M` |
| `FAMILY_PALETTE` | which ladder each bucket family draws from | this file's own decision |

`styleFor(palette, tier, verb, upTo)` composes them. Nothing in it reads a price or decides
a tier.

Alpha is written out on every colour because the game's default alpha is not the same on all
three lines — 240 on a background, 255 on a border and a text colour — so a table that left
it off would be three tables.

## Palettes

| Palette | Families | Drawn as |
| --- | --- | --- |
| `currency` | `stackables`, `div-cards`, `fragments`, `misc` | NeverSink's currency ladder |
| `gems` | `gems` | cyan, triangles |
| `bases` | `bases` | cyan, diamonds |
| `uniques` | `uniques-by-base`, `replicas`, `corruptible-uniques` | the unique brown, stars |
| `foulborn` | `foulborn` | the unique templates with their browns swapped for purple |
| `maps` | `maps`, `unique-maps` | one row per treatment, keyed by tier |
| `default` | anything whose note carries no family | the currency look |

Foulborn is **derived**, not written: `foulborn.md` says *follow the same rules as uniques,
visually they should have a purple-ish tint*, so each `U:` template is taken and its browns
swapped. The beam and icon colour swap with it — `MinimapIcon` and `PlayEffect` take names
rather than numbers, so the tint there has to be a name.

## The check marker

A `check` keeps the styling of the rung it sits on and lays a marker over the top. Gold is
the colour code of check, and all five values are configurable under `check` in
`tiers.json`.

| | Take | Check |
| --- | --- | --- |
| text | the tier's | `255 190 0 204` |
| border | the tier's | `255 190 0 255` |
| size | the tier's | `L` |
| icon | the tier's | yellow star, **only if the tier drew one** |
| beam | the tier's | yellow, **taken from the aspirational tier** |
| sound | the tier's | unchanged |

**Recolour, never invent.** A check turns gold the marks the ladder already spent; it never
adds one the rung drew none of. So a `T4` check has no minimap icon, because `T4` take has
none.

**The icon follows the tier the item is; the beam follows the tier it could be.**
`PlayEffect` is the only mark the game draws out in the world rather than on the label or
the minimap, and what makes a drop worth crossing a room for is the upside rather than the
guarantee. A 1c Heavy Belt is a 1c label that beams like the Mageblood it might be.

The aspirational rung reaches the styler through a new `#@` note key, `upto`, written only
when it differs from `tier`. It is also part of the block grouping key in `emit-filter.ts` —
two checks at one rung with different upside are two different-looking blocks, and merging
them would draw one of them wrongly.

The sound is never a check's business. It is the one line that says *stop what you are
doing*, and a maybe has not earned it.

## Gamble

A `gamble` swaps the rung's template for that rung's `gambleTemplate` and changes nothing
else — the rung decides how loud, the gamble decides the paint. The three `:Gamble`
templates are typed out rather than derived, because the reddish backgrounds `buckets.md`
gives them are not a function of anything.

The border is the one line all three share: **a gamble is outlined in red at every rung.**
`U:BrownAndBlack:Gamble` carried a black border until it was pointed out that a black
outline on a reddish brown is not an outline anyone can see, and that rung is where most
gambles land — `uniques.md` disqualifies anything already at T2 or louder, so T3 and T4 are
the whole of it in practice.

## Sounds and the drop noise

Every sound in `buckets.md` is written `Sound:n:300:Drop`, so a block with an alert sound
also emits `EnableDropSound` — the metallic clatter or the orb's `pling`, which an item can
carry as well as a filter alert. A silent block has no drop noise to restore, so the two
travel together in the code rather than as separate fields.

## Choices that were mine, not the docs'

The first things to change if they read badly in game:

1. **`Cyan` `0 148 168` and `Purple` `110 60 160`.** `bases.md` and `gems.md` ask for a cyan
   and `maps.md` for a purple; the values are mine. Cyan is the riskiest — it carries white
   text on bases and black text on gems, which is the pairing most likely to fail.
2. **The check gold `255 190 0`.** It is both the border and the label text, so it has to
   stay readable over all three unique backgrounds: white at T0, brown at T1/T3/T4,
   near-black at T2. The white T0 background is the one to watch.
3. **The Foulborn purples**, `150 90 200` and `38 20 55`.
4. **`M` = 30.** `uniques.md` asks for size M at T3 take; `buckets.md`'s size table has only
   XL, L, S and XS.
5. **`C:OrangeAndBlack` is drawn on orange, not black.** `buckets.md` line 28 writes
   `BG:Black`, which paints black text on a black background — a T3 currency block nobody
   can read. Every other template there is named `<Background>And<Text>`, so the line
   contradicts its own name, and reading it as orange lands exactly on NeverSink's `t3annul`.
   **The doc still has the typo.**
6. **`maps:Tink`'s icon.** `buckets.md` writes `Icon:Red:(Square:Purple)`, putting a colour
   where the size goes. Read as a large purple square, since `maps.md` gives all three
   treatments that use it a purple beam.
