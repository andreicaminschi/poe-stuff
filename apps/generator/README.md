# @poe/generator

Turns the published catalog into a styled `.filter`. **Only the first phase is written**:
the condition domains, and the normalizer that uses them.

`plan.md` holds the bucketing design, which is not built.

## Why domains exist

A `.filter` is an ordered list of blocks and the first match wins, so a block that leaves a
condition out beats every block below it that names one. Order becomes load-bearing, and the
generator has to know which blocks are more specific than which.

Naming every condition on every block removes that. Two blocks then overlap only if they
share an item, and a cover of distinct forms never does — so the blocks can be written in any
order.

To name a condition you have to know the values it takes. That is a domain.

## The two functions

`collectDomains(forms)` walks every resolved form in the catalog and returns one domain per
condition name. `normalizeConditions(forms, domains)` takes one group's forms and writes the
missing conditions out as their whole domain.

A form is a row or one of its variants, resolved: category over subcategory over row over
variant, with every `from` filled. `@poe/filter-compile` does that, and the domain code never
sees an unresolved condition.

Conditions fold into one clause per name first. `ItemLevel >= 85` and `ItemLevel <= 85` are
two lines and one clause, which is what makes two forms comparable.

## Two kinds of domain

A domain is `registry` or `observed`, and the difference matters.

`registry` comes from `@poe/filter-eval`'s condition table, which publishes the closed value
set for every boolean, enum and ordered condition. `HasInfluence` holds all seven influences
whether the catalog carried them or not, so the domain is the same next run. A value outside
it is reported rather than added.

`observed` is the union of what this catalog happened to carry. `BaseType` and `Class` have
no published set, so there is nothing else to build them from. **That makes them data
dependent**: a base missing from one run's pricing drops out of the domain, and every block
that would have listed it silently narrows. That is why the table is written to the lake per
run — diff two runs and a domain that moved is visible.

## What does not normalize

`Sockets`, `SocketGroup`, `HasEnchantment`, `HasExplicitMod` and `TransfiguredGem` compare as
neither a set nor a range. They are left alone and named in `problems`.

A numeric domain can end up open at one or both ends, because the catalog only ever says
`>= 84` or `<= 83` and never the bounds themselves. `ItemLevel` is open today. An open domain
cannot be written out as a condition line, so item level is the one axis that still needs
either a declared range or a specificity rule.

## Running it

Reads `catalog/latest/<league>.catalog.json` and its categories, writes
`generator/domains/<league>.json`.

```bash
node --env-file=apps/generator/.env apps/generator/domains-cli.ts
```

| Var | Holds |
| --- | --- |
| `POE_LEAGUE` | Which league's published catalog to read. No default |
| `LAKE_ROOT` | Where the lake lives. Optional, `.s3` |
