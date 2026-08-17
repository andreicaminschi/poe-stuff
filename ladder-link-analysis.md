# Finding links in ladder data — method

Discovering which items, stats, skills and passives go together, from a snapshot
of characters. Written 2026-08-15, no prior data-analysis background assumed.

---

## The core idea

Count how often two things appear together, and compare that to how often they
*would* appear together if they had nothing to do with each other.

Worked example:

- 3% of characters use **Cyclone**
- 2% of characters wear **Brass Dome**

If unrelated, the share with both is about `3% x 2% = 0.06%`. That is the
"random chance" baseline. Go count the real number — say it comes out at
**1.5%**. That is **25x** the baseline, so the two are linked.

That ratio is called **lift**, and it is the entire technique. Everything below
is bookkeeping around this one calculation.

- **lift ~ 1** — no relationship, ignore
- **lift >> 1** — they go together
- **lift < 1** — they avoid each other (competing keystones, exclusive slots)

No game knowledge required. The data says it.

---

## The pipeline

```
raw character data
      |  (1) extract        turn each character into a list of "features"
(character, feature) rows
      |  (2) count singles  how common is each feature on its own?
      |  (3) prune          discard anything too rare to trust
      |  (4) count pairs    how often does each pair appear together?
      |  (5) score          actual / expected-by-chance
ranked list of links
      |  (6) view           read the list, or draw it as a graph
```

Only stage 1 knows anything about Path of Exile. Stages 2-6 are generic and
would work unchanged on shopping baskets or song playlists.

---

## (1) Extract

One function: character in, flat list of strings out. Prefix each string with
its kind so it can be filtered later.

```js
function extractFeatures(character) {
  const f = [];

  f.push(`class:${character.class}`);
  f.push(`level:${Math.floor(character.level / 10) * 10}s`);  // 90s, 80s...

  for (const item of character.items) {
    if (item.name) f.push(`unique:${item.name}`);
    f.push(`base:${item.baseType}`);

    for (const mod of item.explicitMods ?? []) {
      f.push(`mod:${normalizeMod(mod)}`);
    }
    for (const gem of item.socketedItems ?? []) {
      f.push(`skill:${gem.baseType}`);
    }
  }

  for (const node of character.passives ?? []) {
    f.push(`passive:${node}`);
  }

  return [...new Set(f)];   // dedupe: "has it", not "how many"
}
```

### Mod normalization is the critical detail

Mods arrive with rolled numbers baked into the text. `"+37% to Fire Resistance"`
and `"+41% to Fire Resistance"` are the same mod but different strings. Left
alone, they become thousands of near-identical features that each look rare and
get pruned away. Strip the digits:

```js
function normalizeMod(text) {
  return text.replace(/[0-9]+(\.[0-9]+)?/g, '#').trim();
  // "+37% to Fire Resistance"  ->  "+#% to Fire Resistance"
}
```

Things to watch for here:

- **Crafted / fractured / veiled mods** behave very differently from normal
  explicits. Give them their own prefix (`crafted:`) rather than merging.
- **Hybrid mods** occupy one affix but print two lines.
- **Cross-patch snapshots** may contain mod text that was reworded between
  leagues, splitting one mod into two features.
- If the source data offers canonical stat identifiers instead of display text,
  prefer them — they are already roll-free and language-independent, which
  removes this whole class of problem.

### Extract generously

**You can only discover what you extracted.** The function above reads explicit
mods, base types and unique names — so implicits, enchants and corruptions are
invisible to every stage that follows, no matter how good the math is. This is
the single biggest limit on what the whole pipeline can find. Add everything:

```js
for (const mod of item.implicitMods  ?? []) f.push(`implicit:${normalizeMod(mod)}`);
for (const mod of item.enchantMods   ?? []) f.push(`enchant:${normalizeMod(mod)}`);
for (const mod of item.craftedMods   ?? []) f.push(`crafted:${normalizeMod(mod)}`);
for (const mod of item.fracturedMods ?? []) f.push(`fractured:${normalizeMod(mod)}`);
if (item.corrupted)  f.push('flag:corrupted');
if (item.influences) for (const k of Object.keys(item.influences)) f.push(`influence:${k}`);
if (item.quality)    f.push(`quality:${item.baseType}:${item.quality}`);

// gem levels - Enlighten 3 vs 4 is exactly the kind of luxury split worth seeing
if (gem.properties) f.push(`gem:${gem.baseType}:${gemLevel(gem)}`);
```

Also worth emitting the item together with its slot (`slot:Ring2:Valyrium`),
since which slot an item occupies sometimes carries meaning the name alone does
not.

### Build the table

```js
const rows = [];
for (const c of allCharacters) {
  for (const feat of extractFeatures(c)) rows.push([c.id, feat]);
}
```

Result is deliberately dumb and repetitive:

| character | feature |
|---|---|
| Bob | skill:Cyclone |
| Bob | unique:Brass Dome |
| Bob | mod:+#% to Fire Resistance |
| Alice | skill:Cyclone |
| Alice | unique:Headhunter |

**Save this to a file.** Stage 1 is the slow, fiddly stage and everything after
it is fast. Checkpointing here means experimenting later never requires
re-parsing the raw data.

---

## (2) Count singles

```js
const total = new Set(rows.map(r => r[0])).size;   // number of characters

const single = new Map();
for (const [id, feat] of rows) {
  single.set(feat, (single.get(feat) ?? 0) + 1);
}
```

---

## (3) Prune

Drop any feature held by fewer than ~20 characters.

```js
const MIN = 20;
const keep = new Set([...single].filter(([, n]) => n >= MIN).map(([f]) => f));
```

Not optional, for two independent reasons:

- **Quality.** Two players sharing one obscure item produces an enormous lift
  off a sample of two. Pure noise, and it floods the top of the results.
- **Speed.** Stage 4 grows with the square of the features per character.
  Pruning is what keeps it tractable.

---

## (4) Count pairs

```js
const byChar = new Map();
for (const [id, feat] of rows) {
  if (!keep.has(feat)) continue;
  if (!byChar.has(id)) byChar.set(id, []);
  byChar.get(id).push(feat);
}

const pair = new Map();
for (const feats of byChar.values()) {
  feats.sort();                                  // so A|B and B|A collide
  for (let i = 0; i < feats.length; i++) {
    for (let j = i + 1; j < feats.length; j++) {
      const k = feats[i] + '|' + feats[j];
      pair.set(k, (pair.get(k) ?? 0) + 1);
    }
  }
}
```

A character with 60 features contributes ~1,800 pairs. Across 15,000 characters
that is ~27 million increments — a slow minute in plain JavaScript, which is
fine. This is the stage that becomes expensive as the dataset grows.

---

## (5) Score

```js
const results = [];
for (const [k, both] of pair) {
  if (both < MIN) continue;
  const [a, b] = k.split('|');
  const na = single.get(a), nb = single.get(b);

  const expected = (na / total) * (nb / total) * total;
  const lift     = both / expected;

  results.push({
    a, b, both,
    lift,
    aThenB: both / na,     // of characters with A, share that also have B
    bThenA: both / nb,
  });
}

results.sort((x, y) => y.lift - x.lift);
```

### Keep both directional numbers

The asymmetry between `aThenB` and `bThenA` is frequently the real finding. If
95% of characters holding item A also hold item B, but only 4% of B-holders
hold A, then B is a staple and A is one niche build that depends on it. A single
symmetric score hides that entirely.

---

## (6) View

Output is a table:

| A | B | both | lift | A->B | B->A |
|---|---|---|---|---|---|
| skill:Cyclone | unique:Brass Dome | 312 | 25.4 | 0.41 | 0.88 |
| mod:+#% Chaos Res | passive:Chaos Inoculation | 890 | 8.1 | 0.22 | 0.79 |

**As a sorted list.** Dump to CSV, open in Excel, filter by prefix — `skill:` in
column A and `unique:` in column B answers "which items go with which skills".
Start here. It is underrated and ten minutes of filtering teaches a lot.

**As a graph.** Write rows out as `A, B, lift` (an "edge list") and open it in
[Gephi](https://gephi.org), which is free. Features become dots, links become
lines, and strongly-linked features get pulled into visible clumps — each clump
is a build archetype. Keep only the strongest ~10 links per feature first, or
the result is an unreadable hairball.

---

## Two traps

### The game's own rules will dominate the results

Early output will be things like "characters with Chaos Inoculation have 1 life"
— a perfect correlation and completely useless, because it is a game mechanic
rather than a player choice.

**Fix:** compute lift *within* a single class or ascendancy, then compare it to
the lift across all characters. A link much stronger inside one group than
overall is a genuine finding. One that is equally strong everywhere is usually
just a rule of the game.

### Copied builds will swamp everything

Hundreds of players follow the same build guide, producing near-identical
characters. Every feature of that one build appears massively linked to every
other, crowding out everything else.

Two fixes, answering different questions:

- **Collapse near-duplicates.** Merge characters sharing >90% of their features
  into a single weighted row. Gives honest statistics.
- **Embrace it.** Treat each cluster as an archetype and catalogue it. Usually
  the more interesting output: "here are the 40 builds that exist this league,
  and what defines each one."

---

## Finding things you don't already know

Sorting by lift surfaces the strongest links, which are usually the ones you
could have guessed. The genuinely new findings are elsewhere in the table, and
they have a recognisable shape. Once that shape can be described, it can be
filtered for — which means hunting for discoveries without having to suspect
anything in advance.

### The luxury-upgrade fingerprint

Motivating case: CWDT builds nearly all wear a particular ring, and the good
ones wear a corrupted version with a rare implicit. The ring is a requirement;
the implicit is an upgrade. Both are findable, and they look different in the
data.

With A = the build (`skill:Cast when Damage Taken`) and B = the thing tested:

| | the ring | the corrupted implicit |
|---|---|---|
| **A->B** — share of the build that has it | 0.99 | 0.31 |
| **B->A** — share of its owners running this build | 0.72 | **0.96** |
| **lift** | 45 | **310** |

The second row is the tell. Only 31% of the build carries the implicit, so it is
clearly optional — but 96% of everyone in the game who has that implicit is
running this one build. Nobody else wants it.

```js
const luxury = results.filter(r =>
  r.lift > 10 &&                          // strongly associated
  r.aThenB > 0.10 && r.aThenB < 0.70 &&   // optional, not a requirement
  r.bThenA > 0.80                         // but almost exclusive to this build
);
```

Reading the three cases:

- **A->B near 1.0** — a requirement. Mostly already known.
- **A->B moderate + B->A near 1.0** — *optional but exclusive*. The luxury/tech
  band, and where unknown findings live.
- **A->B moderate + B->A moderate** — a generically popular thing. Less
  interesting.

Run that filter across the whole table and it returns every "the good version of
this build uses X" for every archetype at once.

### Profiling a group

The other mode: point at one feature and ask what is unusual about the
characters who have it.

```js
function profile(anchor) {
  const inGroup = [...byChar].filter(([, f]) => f.includes(anchor));
  const G = inGroup.length;

  const counts = new Map();
  for (const [, feats] of inGroup)
    for (const f of feats) counts.set(f, (counts.get(f) ?? 0) + 1);

  return [...counts]
    .filter(([f, n]) => f !== anchor && n >= 10)
    .map(([f, n]) => ({
      feature: f,
      share:      n / G,                              // how much of the group has it
      enrichment: (n / G) / (single.get(f) / total),  // versus everyone else
      n,
    }))
    .sort((a, b) => b.enrichment - a.enrichment);
}
```

Bucketing the output by `share` turns a wall of numbers into something readable:

| share | meaning | example |
|---|---|---|
| 0.90 - 1.00 | **core** — the build's definition | the ring itself |
| 0.50 - 0.90 | **standard** | the usual support gems |
| 0.10 - 0.50 + high enrichment | **luxury / tech** — discoveries here | the corrupted implicit |
| < 0.10 | experimental, or noise | |

The top band describes what the build *is*. The luxury band describes what
experienced players know that the build guide left out.

### Upgrade, or just a variant?

A 31% share is ambiguous on its own — it could be a luxury upgrade, or one of
two equally valid options. Separate them by checking whether the haves are
further along than the have-nots:

```js
// within the group only, split by whether they have the feature
const withIt    = inGroup.filter(([, f]) => f.includes(feature));
const withoutIt = inGroup.filter(([, f]) => !f.includes(feature));
// compare: median level, ladder rank, count of OTHER high-enrichment items
```

Systematically higher level, better rank, and more of the other luxury items
means it is an upgrade, and a progression path has been found. Two halves that
look statistically identical means it is only a preference.

Gear correlates with wealth and wealth correlates with progress — that
relationship is what separates "better" from "different", and pure co-occurrence
counting cannot see it.

### Analyze items, not only characters

Questions about a property *of an item* want a second table:
`(item_instance, property)`, one row per actual copy of an item in the snapshot,
each labelled with its owner's archetype. Then the distribution can be compared
across owners:

| copies of the ring | rare implicit | other implicit | no implicit |
|---|---|---|---|
| held by CWDT builds | 31% | 12% | 57% |
| held by everyone else | 2% | 9% | 89% |

This generalises into an automatic discovery pass: for every unique item, diff
the mod distribution of the top-ranked owners' copies against the median
owner's copies. Anything over-represented among the good players' copies is an
upgrade target — across every item in the game, with none of them named in
advance.

### Two guards

**Do not let the global prune eat the interesting features.** `MIN = 20` suits
common features; a luxury implicit might exist on 40 items game-wide and barely
survive, or fall below the line entirely. Use a lower floor (around 5) for the
inherently rare namespaces — `implicit:`, `enchant:`, `crafted:`, `influence:` —
and let the conditional queries do the filtering instead.

**Small numbers lie.** 8 out of 10 looks like 80% and can be coincidence; 800
out of 1000 cannot. Require 10-15 real occurrences inside a group before
believing an enrichment figure, and treat any spectacular ratio sitting on a
tiny count with suspicion — it is the rare-pair noise problem from stage 3 in
a different disguise.

---

## When this outgrows plain JavaScript

Everything above runs with no dependencies and should carry to roughly 100,000
characters. Past that — or once variations are being re-run constantly — move
stages 2-5 into [DuckDB](https://duckdb.org): a single downloadable file, no
install, reads CSV directly, and collapses the whole thing into one SQL query
that runs in seconds rather than minutes.

```sql
WITH marg AS (
  SELECT feature, COUNT(DISTINCT char_id) AS n FROM facts GROUP BY 1
), total AS (SELECT COUNT(DISTINCT char_id) AS N FROM facts),
pairs AS (
  SELECT a.feature AS f1, b.feature AS f2, COUNT(*) AS nab
  FROM facts a JOIN facts b USING (char_id)
  WHERE a.feature < b.feature
  GROUP BY 1, 2 HAVING COUNT(*) >= 20
)
SELECT f1, f2, nab,
       (nab::DOUBLE * N) / (m1.n * m2.n) AS lift,
       nab::DOUBLE / m1.n                AS conf_f1_to_f2,
       nab::DOUBLE / m2.n                AS conf_f2_to_f1
FROM pairs
JOIN marg m1 ON m1.feature = f1
JOIN marg m2 ON m2.feature = f2, total
ORDER BY lift DESC;
```

Same math, same pipeline, faster engine. Not worth reaching for until the
JavaScript version actually becomes annoying.

### Refinements worth knowing exist

- **Normalized PMI** — a bounded (-1 to 1) alternative to lift that does not
  explode on rare pairs. Better for ranking once the dataset is large.
- **Triples instead of pairs** — the same counting extended to three features
  at a time. Far more combinations, so it needs aggressive pruning, but it finds
  interactions that pairwise counting misses.
- **Community detection** (Louvain) — automatic clustering of the graph into
  archetypes, rather than eyeballing the clumps in Gephi.

---

## Environment note

Node v26.4.0 is installed on this machine; Python is not (the `python` command
resolves to a Microsoft Store stub and fails). The JavaScript above runs as-is
with `node script.js` and needs no npm packages.
