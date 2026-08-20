# Filter evaluation, stage 2

**Goal:** the three condition kinds stage 1 throws on — `sockets`, `counted` and `gem` —
parse and match, so a real filter loads whole.

Stage 1 is on the `filter-eval` branch and covers the other five kinds. Nothing outside
`packages/filter-eval/` changes.

## What is left

| Kind | Conditions | Uses in the NeverSink sample |
| --- | --- | --- |
| `sockets` | `Sockets`, `SocketGroup` | 30 |
| `counted` | `HasExplicitMod`, `HasEnchantment` | 192 |
| `gem` | `TransfiguredGem` | 1 |

## The forms that actually appear

Counted from `packages/filter/neversink-sample.filter`, not from the syntax doc.

```
Sockets >= 3            17x     count only
Sockets >= 6             4x
Sockets < 1              1x     "no sockets"
Sockets >= AAAA          3x     colours only, no count
SocketGroup "RGB"        4x     quoted, operator omitted
SocketGroup "A"          1x

HasExplicitMod "A" "B"          61x    no count: at least one
HasExplicitMod >=4 "A" "B"      36x    count glued to the operator
HasExplicitMod =0 "A" "B"       28x    none of these
HasExplicitMod >=2 ...          26x
HasExplicitMod =1 ...            1x

TransfiguredGem True             1x
```

The doc also allows `HasExplicitMod >= 4 "..."` with a space, and
`TransfiguredGem "Leap Slam"` by name. Both are handled.

## Things I assumed

Tell me if any of these is wrong — each one changes a matcher.

1. **The operator applies to the count, colours are always "at least".** `Sockets >= 5GGG`
   is five or more sockets with three or more green, which is the gloss the syntax doc puts
   on its own example. `SocketGroup "RGB"` then means a linked group holding at least one of
   each, which is the chromatic recipe and is why NeverSink writes it. Applying `=` strictly
   to colours would make that line match almost nothing.
2. **An item holds its sockets as space-separated linked groups**, e.g. `"RGB BB"` — letters
   inside a group are linked to each other, a space starts a new group. `Sockets` reads all
   the letters and ignores the spaces; `SocketGroup` tries each group and matches if any one
   satisfies. This is the shape the item parser will have to produce, so it is worth
   disagreeing with now rather than in stage 3.
3. **A count counts listed patterns, not item mods.** `HasExplicitMod >=2 "of Haast" "of Tzteosh"`
   wants two of those two names present, not one name matching two of the item's mods.
4. **Mod names match as substring, case-insensitively.** The sample writes `"Elevated "` with
   a trailing space to stop it matching inside a longer word, which only makes sense if
   matching is substring.
5. **`TransfiguredGem` holds the gem name, and `""` means the item is not one.** So `True` is
   a non-empty name, `False` is the empty string, and a name is a substring match. A missing
   key still fails, the same as every other condition.

## Steps

| # | File | Change |
| --- | --- | --- |
| 1 | `filter-eval/filter-ast.ts` | Type the three item shapes: `sockets` and `gem` hold `string`, `counted` holds `readonly string[]`. Add `SOCKET_COLOURS` (`R G B A D W`) and the `SocketSpec` / `CountedSpec` types the parser produces. |
| 2 | `filter-eval/parse-filter.ts` | Parse a socket spec — optional number then optional letters, quoted or bare — and reject an unknown letter. Parse a counted spec — optional glued or spaced `<op><number>`, then one or more names. Parse `gem` as `True`/`False` or a name. Drop the three stage-2 throws. |
| 3 | `filter-eval/evaluate-filter.ts` | Three matchers. `sockets`: count the letters, compare the total by operator, compare each colour by at-least; `SocketGroup` tries each group. `counted`: count how many listed names appear as a substring of any item mod, compare by operator, defaulting to `>= 1` when no count was written. `gem`: boolean-or-name. |
| 4 | `filter-eval/parse-filter.test.ts` | Replace the "throws, stage 2" tests with parse tests for every form above, plus the new throws: bad socket letter, count with no names, non-numeric count. |
| 5 | `filter-eval/evaluate-filter.test.ts` | Matcher tests: total vs colour, `Sockets` ignoring links where `SocketGroup` does not, `=0` meaning none, no-count meaning at least one, gem both ways. |
| 6 | `filter-eval/neversink.test.ts` | Add a real fixture using the stage-2 lines — the six-link recipe block and one `HasExplicitMod` rare block, verbatim. |
| 7 | — | Check it works. |

## How you check it

```
yarn typecheck
yarn test packages/filter-eval
```

Then the thing stage 1 could not do: parse
`packages/filter/neversink-sample.filter` whole, all 784 blocks, with nothing removed.
That is the acceptance test for this stage, and I will run it and report the count.
