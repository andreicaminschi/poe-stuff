Unique items

Categories to be included
accessory, armour, flask, jewel, weapon, sanctum, tincture


Unique items have 3 verbs - Take, Check, Gamble

Take is the guaranteed value - the price of the cheapest unique on that base
Check is the aspirational value - the price of the most expensive unique on that base
Gamble is a different tier altogether, configured by the user


TIERING

There is one cut per tier, not a take cut and a check cut.
Both the guaranteed value and the aspirational value are measured against the same cuts.

    T0  5 div      godlike
    T1  1 div      jackpot
    T2  0.25 div
    T3  0.1 div
    T4  0.05 div   worth bending down for

The rule is the comparison between the two:

    if the guaranteed value and the aspirational value land on the same tier
        -> that tier, as a Take
    if they land on different tiers
        -> STILL the guaranteed tier, as a Check

The aspirational value never raises the tier. A unique is shown at what it is guaranteed to
be worth, because that is the only thing actually on the ground - a 1c unique with the
potential to be 10div looks like a 1c unique, marked. The upside is carried by the Check
marker, not by the rung.

Examples

    cheapest 25c, dearest 30c   -> both T3          -> T3 Take
    cheapest 25c, dearest 300c  -> T3 and T1        -> T3 Check
    cheapest 60c, dearest 70c   -> both T2          -> T2 Take
    cheapest 3div, dearest 8div -> T1 and T0        -> T1 Check

T4 has a cut like every other rung. It is not a catch-all: T4 is meant to be a drop you
really want to pick up off the floor, and a base guaranteed under 0.05 div is not that. What
fails it is hidden. A base nothing prices anywhere gets no block either, because there is
nothing to say about it.

Two things still reach past the cut, and only two:

    the aspirational value clears it   -> T4, as a Check
    the base is a gamble               -> T4, drawn as a gamble

A Heavy Belt is guaranteed 1c and might be Mageblood; a Leather Belt might be Headhunter.
Neither clears the cut on its guarantee and both are worth drawing. T4 is the floor of the
ladder in both cases, never a rung the ceiling won - the aspirational value decides the base
is worth SHOWING, it still never decides how loud.

EVERY cut is in DIVINE, including the bottom two. The ladder is one unit from top to bottom,
so the rungs keep their spacing forever and T3 can never collide with T4. The cost is that
the whole ladder drifts with the divine price: 0.05 div is about 3c at a league-start divine
of 60c and about 10c at 200c. That is the intended direction - generous while everything is
cheap, tighter as the league runs and a chaos stops being worth stopping for.

The floor price is the one number quoted in CHAOS, because it is a claim about the player's
time rather than about wealth. It is applied to every rung this ladder hands back, and
`persistent` is the source of truth when the two disagree: a persistent rung keeps its tier
at any floor the player sets. Every rung here is persistent today, so the floor changes
nothing - it is wired so that a rung added later WITHOUT the flag is actually subject to it.


STYLING

    T0  - U:WhiteAndBrown, Whoosh, XL, Beam:Brown:Permanent, Persistent
    T1  - U:BrownAndWhite, Zdrang, L, Beam:Brown:Permanent, Persistent
    T2  - U:BrownAndBrown, Unique, L, Beam:Brown:Permanent, Persistent
    T3  - U:BrownAndBlack, Icon:White:Star:Small, M, Persistent
    T4  - U:BrownAndBlack, S, Persistent

Check keeps the styling of the tier it is on and adds a marker on top. Gold is the colour
code of Check, and the marker is configured in tiers.json under "check":

    - a gold border, replacing whatever the tier drew
    - the tier's own background mixed a fifth of the way toward the gold, never replaced
    - the label text black or white, whichever reads on that background
    - size L
    - the minimap icon turned yellow, IF the take tier drew one
    - the beam taken from the ASPIRATIONAL tier and turned yellow, IF that tier has one
    - the sound left exactly as the tier set it

Recolour, never invent. A Check turns gold the marks the ladder already spent; it never adds
one the tier drew none of.

The icon comes from the tier the item IS. T4 draws no minimap icon, so a T4 Check draws
none either - the quietest unique in the file stays quiet on the map however large its
upside.

The beam comes from the tier the item COULD BE. PlayEffect is the only mark the game draws
out in the world rather than on the label or the minimap, and what makes a drop worth
crossing a room for is the upside, not the guarantee. So a 1c Heavy Belt is a 1c label that
beams like the Mageblood it might be. If the aspirational tier has no beam either - a T4
that could be T3 - there is nothing to recolour and no beam is drawn.

    tier T4, upTo T0    gold border, yellow beam, no icon
    tier T4, upTo T3    gold border, no beam, no icon
    tier T3, upTo T0    gold border, yellow beam, yellow star
    tier T2, upTo T0    gold border, yellow beam, yellow star, tier's own sound

The sound is never the Check's business. It is the one line that says stop what you are
doing.

The whoosh and the red-and-white are sacred. They mean clear value is on the ground, and a
maybe never earns them - a T0 Check is a T0 Take's colours at size L with a gold border, a
yellow beam and a yellow star, not a second whoosh.


GAMBLE

Gamble is decided after the tier, and only replaces the template - the rung the bucket
already sits on decides how loud it is.

A base is a gamble when all of the following hold:
- it did not already earn T2 or louder on its own price. Anything that loud does not need
  selling as a lottery ticket
- some unique on the base corrupts into something worth at least 5x what it is
- the base's price is at or under the user's gamble ceiling

The base's price for this test is its most expensive unique - what the player stands to
destroy by vaaling blind.

For example
If the gamble ceiling is 30c, any base whose dearest unique is at most 30c is eligible.
There are some bases with an expensive unique and a cheap one on the same base.
Mageblood is a Heavy Belt worth hundreds of divines, but shares the base with Bisco's Leash
which is 10c - this makes Heavy Belts never eligible for gambling.
Anathema is a unique Moonstone Ring usually worth 10c, sharing a base with Valyrium at 1c.
At a 30c gambling ceiling Moonstone Rings are marked as gambling.
At a 5c gambling ceiling they are NOT, because Anathema is worth 10c.

As a feature, to allow knowledgeable users to highlight Bisco's Leash for vaaling, there is
an option to "exclude" expensive uniques from the gamble price calculation. The user enables
it and enters a cutoff, something like 100c.

Heavy Belt price examples
Mageblood       35000c  - cutoff
Bisco's         10c
Dyadian Dawn    150c    - cutoff
Siegebreaker    40c

This means the Heavy Belt price is now 40c and would display as a gamble base for gamble
ceilings 40 and above.
However, if Siegebreaker was priced at 70c and the gamble ceiling was 50c, Heavy Belts are
no longer vaalable bases.

A gamble base has a red-ish tint applied to BG, border and text.
